mod capture;
mod config;
mod tray;

use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager, State};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};

// macOS: アクセシビリティ権限チェック (CGEventTap に必要)
#[cfg(target_os = "macos")]
#[link(name = "ApplicationServices", kind = "framework")]
extern "C" {
    fn AXIsProcessTrusted() -> u8;
}

#[cfg(target_os = "macos")]
fn accessibility_trusted() -> bool {
    unsafe { AXIsProcessTrusted() != 0 }
}

#[cfg(not(target_os = "macos"))]
fn accessibility_trusted() -> bool {
    true
}

pub struct AppState {
    pub settings: Mutex<config::AppSettings>,
}

// ============================================================
// Tauriコマンド
// ============================================================

#[tauri::command]
fn get_settings(state: State<AppState>) -> config::AppSettings {
    state.settings.lock().unwrap_or_else(|e| e.into_inner()).clone()
}

#[tauri::command]
fn save_settings(
    state: State<AppState>,
    app: AppHandle,
    settings: config::AppSettings,
) -> Result<(), String> {
    config::save_settings(&settings)?;
    let mut s = state.settings.lock().unwrap_or_else(|e| e.into_inner());
    *s = settings.clone();
    drop(s);
    let _ = register_hotkeys(&app, &settings.hotkeys);
    Ok(())
}

#[tauri::command]
async fn show_overlay(app: AppHandle) -> Result<(), String> {
    if let Some(win) = app.get_webview_window("overlay") {
        fit_overlay_to_screen(&app, &win);
        let _ = win.show();
        let _ = win.set_focus();
    }
    Ok(())
}

#[tauri::command]
async fn hide_overlay(app: AppHandle) -> Result<(), String> {
    if let Some(win) = app.get_webview_window("overlay") {
        let _ = win.hide();
    }
    Ok(())
}

#[tauri::command]
async fn capture_region(
    app: AppHandle,
    state: State<'_, AppState>,
    x: i32,
    y: i32,
    width: u32,
    height: u32,
) -> Result<(), String> {
    let show_cursor = state.settings.lock().unwrap_or_else(|e| e.into_inner()).show_cursor;
    if let Some(win) = app.get_webview_window("overlay") {
        let _ = win.hide();
    }
    if let Some(editor) = app.get_webview_window("editor") {
        let _ = editor.hide();
    }
    let path = capture::capture_region(x, y, width, height, show_cursor).await?;
    let (b64, w, h) = capture::load_as_base64(&path)?;
    open_editor_with_image(&app, b64, w, h);
    Ok(())
}

#[tauri::command]
async fn do_capture_fullscreen(app: AppHandle, state: State<'_, AppState>) -> Result<(), String> {
    let show_cursor = state.settings.lock().unwrap_or_else(|e| e.into_inner()).show_cursor;
    if let Some(win) = app.get_webview_window("overlay") {
        let _ = win.hide();
    }
    if let Some(editor) = app.get_webview_window("editor") {
        let _ = editor.hide();
    }
    let path = capture::capture_fullscreen(show_cursor).await?;
    let (b64, w, h) = capture::load_as_base64(&path)?;
    open_editor_with_image(&app, b64, w, h);
    Ok(())
}

#[tauri::command]
async fn get_window_list() -> Vec<capture::WindowInfo> {
    capture::get_window_list().await
}

#[tauri::command]
async fn capture_window_by_id(app: AppHandle, state: State<'_, AppState>, window_id: u32) -> Result<(), String> {
    let show_cursor = state.settings.lock().unwrap_or_else(|e| e.into_inner()).show_cursor;
    if let Some(win) = app.get_webview_window("overlay") {
        let _ = win.hide();
    }
    if let Some(editor) = app.get_webview_window("editor") {
        let _ = editor.hide();
    }
    let path = capture::capture_window_by_id(window_id, show_cursor).await?;
    let (b64, w, h) = capture::load_as_base64(&path)?;
    open_editor_with_image(&app, b64, w, h);
    Ok(())
}

#[tauri::command]
async fn copy_to_clipboard(_app: AppHandle, base64_data: String, ext: String) -> Result<(), String> {
    // ext をホワイトリスト検証
    if ext != "png" && ext != "jpg" {
        return Err(format!("unsupported format: {}", ext));
    }

    let bytes = base64::Engine::decode(
        &base64::engine::general_purpose::STANDARD,
        &base64_data,
    )
    .map_err(|e| format!("base64 decode error: {}", e))?;

    let tmp = std::env::temp_dir().join(format!("simpleshot_export.{}", ext));
    std::fs::write(&tmp, bytes).map_err(|e| e.to_string())?;
    capture::copy_image_to_clipboard(&tmp)
}

#[tauri::command]
async fn save_image(base64_data: String, path: String) -> Result<(), String> {
    capture::save_base64_to_file(&base64_data, &path)
}

#[tauri::command]
fn check_screen_permission() -> bool {
    capture::check_screen_permission()
}

#[tauri::command]
fn check_accessibility_permission() -> bool {
    accessibility_trusted()
}

#[tauri::command]
fn open_system_preferences(_app: AppHandle) {
    let _ = std::process::Command::new("open")
        .arg("x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture")
        .spawn();
}

#[tauri::command]
fn open_accessibility_preferences(_app: AppHandle) {
    let _ = std::process::Command::new("open")
        .arg("x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility")
        .spawn();
}

// ============================================================
// ヘルパー
// ============================================================

fn open_editor_with_image(app: &AppHandle, b64: String, width: u32, height: u32) {
    if let Some(win) = app.get_webview_window("editor") {
        let _ = win.show();
        let _ = win.set_focus();
        let payload = serde_json::json!({
            "image_base64": b64,
            "width": width,
            "height": height,
        });
        let _ = win.emit("capture-complete", payload);
    }
}

/// ホットキーを登録する (単一キー: screenshot)
fn register_hotkeys(
    app: &AppHandle,
    hotkeys: &config::HotkeyConfig,
) -> Result<(), String> {
    let _ = app.global_shortcut().unregister_all();

    let key_str = hotkeys.screenshot.clone();
    let app_clone = app.clone();

    match key_str.parse::<Shortcut>() {
        Ok(shortcut) => {
            app.global_shortcut()
                .on_shortcut(shortcut, move |_app, _shortcut, event| {
                    if event.state == ShortcutState::Pressed {
                        let app2 = app_clone.clone();
                        tauri::async_runtime::spawn(async move {
                            trigger_capture(&app2).await;
                        });
                    }
                })
                .map_err(|e| format!("shortcut register error for '{}': {}", key_str, e))?;
            eprintln!("[hotkey] registered: '{}'", key_str);
        }
        Err(e) => {
            eprintln!("[hotkey] parse failed for '{}': {:?}", key_str, e);
        }
    }
    Ok(())
}

/// オーバーレイをプライマリモニターにフィットさせる
fn fit_overlay_to_screen(app: &AppHandle, win: &tauri::WebviewWindow) {
    if let Ok(Some(monitor)) = app.primary_monitor() {
        let size = monitor.size();
        let scale = monitor.scale_factor();
        let w = size.width as f64 / scale;
        let h = size.height as f64 / scale;
        let _ = win.set_size(tauri::LogicalSize::new(w, h));
        let _ = win.set_position(tauri::LogicalPosition::new(0.0, 0.0));
    }
}

/// 統合オーバーレイを表示する
pub async fn trigger_capture(app: &AppHandle) {
    // エディタが表示中なら隠す（スクショに写り込み防止）
    if let Some(editor) = app.get_webview_window("editor") {
        let _ = editor.hide();
    }
    if let Some(win) = app.get_webview_window("overlay") {
        fit_overlay_to_screen(app, &win);
        let _ = win.show();
        let _ = win.set_focus();
    }
}

// ============================================================
// エントリポイント
// ============================================================

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let settings = config::load_settings();

    tauri::Builder::default()
        .manage(AppState {
            settings: Mutex::new(settings),
        })
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            #[cfg(target_os = "macos")]
            {
                app.set_activation_policy(tauri::ActivationPolicy::Accessory);
            }

            tray::setup_tray(&app.handle())?;

            let settings = app.state::<AppState>().settings.lock().unwrap_or_else(|e| e.into_inner()).clone();
            if let Err(e) = register_hotkeys(&app.handle(), &settings.hotkeys) {
                eprintln!("Hotkey registration error: {}", e);
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_settings,
            save_settings,
            show_overlay,
            hide_overlay,
            capture_region,
            do_capture_fullscreen,
            get_window_list,
            capture_window_by_id,
            copy_to_clipboard,
            save_image,
            check_screen_permission,
            check_accessibility_permission,
            open_system_preferences,
            open_accessibility_preferences,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
