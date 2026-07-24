use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::process::Command;
use std::time::Duration;

pub fn tmp_path() -> PathBuf {
    let id = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos();
    std::env::temp_dir().join(format!("pashatt_{}.png", id))
}

/// 範囲キャプチャ: screencapture -x -R "x,y,w,h" /tmp/...
pub async fn capture_region(x: i32, y: i32, w: u32, h: u32, show_cursor: bool) -> Result<PathBuf, String> {
    // overlayが隠れるのを待つ
    tokio::time::sleep(Duration::from_millis(200)).await;

    let path = tmp_path();
    let region = format!("{},{},{},{}", x, y, w, h);
    let mut args = vec!["-x", "-R", &region];
    if show_cursor { args.push("-C"); }
    args.push(path.to_str().unwrap());
    let output = Command::new("/usr/sbin/screencapture")
        .args(&args)
        .output()
        .map_err(|e| format!("screencapture failed: {}", e))?;

    if !output.status.success() {
        return Err(format!(
            "screencapture error: {}",
            String::from_utf8_lossy(&output.stderr)
        ));
    }
    ensure_not_blackout(&path)?;
    Ok(path)
}

/// 全画面キャプチャ: screencapture -x (メインディスプレイ)
pub async fn capture_fullscreen(show_cursor: bool) -> Result<PathBuf, String> {
    tokio::time::sleep(Duration::from_millis(200)).await;

    let path = tmp_path();
    let mut args = vec!["-x"];
    if show_cursor { args.push("-C"); }
    args.push(path.to_str().unwrap());
    let output = Command::new("/usr/sbin/screencapture")
        .args(&args)
        .output()
        .map_err(|e| format!("screencapture failed: {}", e))?;

    if !output.status.success() {
        return Err(format!(
            "screencapture error: {}",
            String::from_utf8_lossy(&output.stderr)
        ));
    }
    ensure_not_blackout(&path)?;
    Ok(path)
}

/// ウィンドウIDを指定してキャプチャ
pub async fn capture_window_by_id(window_id: u32, show_cursor: bool) -> Result<PathBuf, String> {
    tokio::time::sleep(Duration::from_millis(150)).await;

    let path = tmp_path();
    let id_str = window_id.to_string();
    let mut args = vec!["-x", "-l", &id_str];
    if show_cursor { args.push("-C"); }
    args.push(path.to_str().unwrap());
    let output = Command::new("/usr/sbin/screencapture")
        .args(&args)
        .output()
        .map_err(|e| format!("screencapture failed: {}", e))?;

    if !output.status.success() {
        return Err(format!(
            "screencapture error: {}",
            String::from_utf8_lossy(&output.stderr)
        ));
    }
    ensure_not_blackout(&path)?;
    Ok(path)
}

fn ensure_not_blackout(path: &Path) -> Result<(), String> {
    if is_mostly_black(path) {
        Err(
            "Screen capture returned a blank image. Quit Pashatt completely, \
             toggle Screen Recording off/on for Pashatt in System Settings, \
             then relaunch the app."
                .into(),
        )
    } else {
        Ok(())
    }
}

/// キャプチャ画像をbase64エンコードして返す
pub fn load_as_base64(path: &Path) -> Result<(String, u32, u32), String> {
    let bytes = std::fs::read(path).map_err(|e| format!("read error: {}", e))?;
    let img = image::load_from_memory(&bytes).map_err(|e| format!("image error: {}", e))?;
    let width = img.width();
    let height = img.height();
    let b64 = base64::Engine::encode(&base64::engine::general_purpose::STANDARD, &bytes);
    Ok((b64, width, height))
}

/// 画像をクリップボードにコピー。
/// macOS の PNG は osascript（«class PNGf»）を優先 — NSPasteboard 直叩きより安定。
/// それ以外は arboard（メインスレッドから呼ぶこと）。
pub fn copy_image_to_clipboard(path: &Path) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        let is_png = path
            .extension()
            .and_then(|s| s.to_str())
            .map(|s| s.eq_ignore_ascii_case("png"))
            .unwrap_or(false);
        if is_png {
            match copy_png_via_osascript(path) {
                Ok(()) => return Ok(()),
                Err(e) => eprintln!("[clipboard] osascript failed, trying arboard: {}", e),
            }
        }
    }

    let bytes = std::fs::read(path).map_err(|e| format!("read error: {}", e))?;
    let img = image::load_from_memory(&bytes)
        .map_err(|e| format!("image error: {}", e))?
        .into_rgba8();

    let (width, height) = img.dimensions();
    let rgba_bytes = img.into_raw();

    let mut clipboard = arboard::Clipboard::new().map_err(|e| e.to_string())?;
    clipboard
        .set_image(arboard::ImageData {
            width: width as usize,
            height: height as usize,
            bytes: rgba_bytes.into(),
        })
        .map_err(|e| e.to_string())
}

/// macOS: PNG ファイルを «class PNGf» で Pasteboard に載せる
#[cfg(target_os = "macos")]
fn copy_png_via_osascript(path: &Path) -> Result<(), String> {
    let path_str = path.to_string_lossy();
    let escaped = path_str.replace('\\', "\\\\").replace('"', "\\\"");
    let script = format!(
        r#"set the clipboard to (read (POSIX file "{}") as «class PNGf»)"#,
        escaped
    );
    let output = Command::new("/usr/bin/osascript")
        .args(["-e", &script])
        .output()
        .map_err(|e| format!("osascript failed: {}", e))?;
    if !output.status.success() {
        return Err(format!(
            "osascript error: {}",
            String::from_utf8_lossy(&output.stderr)
        ));
    }
    Ok(())
}

/// base64データをファイルに保存（パストラバーサル防止付き）
pub fn save_base64_to_file(base64_data: &str, path: &str) -> Result<(), String> {
    let bytes = base64::Engine::decode(
        &base64::engine::general_purpose::STANDARD,
        base64_data,
    )
    .map_err(|e| format!("base64 decode error: {}", e))?;

    let expanded = if path.starts_with("~/") {
        dirs_next::home_dir()
            .map(|h| format!("{}/{}", h.display(), &path[2..]))
            .unwrap_or_else(|| path.to_string())
    } else {
        path.to_string()
    };

    // パストラバーサル防止: ".." を含むパスを拒否
    let canonical_parent = std::path::Path::new(&expanded)
        .parent()
        .ok_or("invalid path: no parent directory")?;
    if expanded.contains("..") {
        return Err("invalid path: path traversal not allowed".to_string());
    }
    // 親ディレクトリが存在することを確認
    if !canonical_parent.exists() {
        return Err(format!("directory does not exist: {}", canonical_parent.display()));
    }

    std::fs::write(&expanded, bytes).map_err(|e| format!("write error: {}", e))
}

/// キャプチャ結果が実質ブラックアウトか（権限不足・entitlement 欠落でよく起きる）
pub fn is_mostly_black(path: &Path) -> bool {
    let Ok(bytes) = std::fs::read(path) else {
        return true;
    };
    let Ok(img) = image::load_from_memory(&bytes) else {
        return true;
    };
    let rgba = img.to_rgba8();
    let data = rgba.as_raw();
    if data.is_empty() {
        return true;
    }
    // サンプリングして平均輝度を見る（全画素走査は重い）
    let step = (data.len() / 4).max(1) / 4096 + 1;
    let mut sum: u64 = 0;
    let mut count: u64 = 0;
    let mut i = 0;
    while i + 3 < data.len() {
        let r = data[i] as u64;
        let g = data[i + 1] as u64;
        let b = data[i + 2] as u64;
        sum += r + g + b;
        count += 1;
        i += 4 * step;
    }
    if count == 0 {
        return true;
    }
    (sum / count) < 8 // 0–765 スケールの平均がほぼ真っ黒
}

/// スクリーン録画権限のチェック（小さな実キャプチャ＋黒判定）
pub fn check_screen_permission() -> bool {
    let path = tmp_path();
    let output = Command::new("/usr/sbin/screencapture")
        .args(["-x", "-R", "0,0,64,64", path.to_str().unwrap()])
        .output();
    let ok = match output {
        Ok(o) if o.status.success() => path.exists() && !is_mostly_black(&path),
        _ => false,
    };
    let _ = std::fs::remove_file(&path);
    ok
}

/// オンスクリーンのウィンドウ一覧を取得 (Quartz経由)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WindowInfo {
    pub id: u32,
    pub name: String,
    pub x: i32,
    pub y: i32,
    pub w: u32,
    pub h: u32,
}

pub async fn get_window_list() -> Vec<WindowInfo> {
    // Swift + CoreGraphics (macOS標準) でウィンドウ一覧取得
    let script = r#"
import CoreGraphics
import Foundation

let opts: CGWindowListOption = [.optionOnScreenOnly, .excludeDesktopElements]
guard let list = CGWindowListCopyWindowInfo(opts, kCGNullWindowID) as? [[String: Any]] else {
    print("[]"); exit(0)
}
struct Rect { var x: Int; var y: Int; var w: Int; var h: Int }
var candidates: [(info: [String: Any], rect: Rect)] = []
let exclude = Set(["Pashatt", "SimpleSHOT", "Dock", "Window Server"])
for w in list {
    let layer = (w[kCGWindowLayer as String] as? NSNumber)?.intValue ?? 99
    if layer != 0 { continue }
    let owner = w[kCGWindowOwnerName as String] as? String ?? ""
    if exclude.contains(owner) { continue }
    guard let b = w[kCGWindowBounds as String] as? [String: Any] else { continue }
    let ww = (b["Width"] as? NSNumber)?.intValue ?? 0
    let hh = (b["Height"] as? NSNumber)?.intValue ?? 0
    if ww < 80 || hh < 80 { continue }
    let id = (w[kCGWindowNumber as String] as? NSNumber)?.intValue ?? 0
    let x = (b["X"] as? NSNumber)?.intValue ?? 0
    let y = (b["Y"] as? NSNumber)?.intValue ?? 0
    candidates.append((["id": id, "name": owner, "x": x, "y": y, "w": ww, "h": hh],
                        Rect(x: x, y: y, w: ww, h: hh)))
}
// Z順 (前面が先) で返るので、完全に隠れているウィンドウを除外
var coveredRects: [Rect] = []
var result: [[String: Any]] = []
for c in candidates {
    let r = c.rect
    // このウィンドウが前面のウィンドウ群で完全に覆われているかチェック
    var covered = false
    for f in coveredRects {
        if f.x <= r.x && f.y <= r.y &&
           f.x + f.w >= r.x + r.w && f.y + f.h >= r.y + r.h {
            covered = true; break
        }
    }
    if !covered {
        result.append(c.info)
    }
    coveredRects.append(r)
}
let data = try! JSONSerialization.data(withJSONObject: result)
print(String(data: data, encoding: .utf8)!)
"#;

    let output = tokio::process::Command::new("/usr/bin/swift")
        .args(["-e", script])
        .output()
        .await;
    match output {
        Ok(o) if o.status.success() => {
            let s = String::from_utf8_lossy(&o.stdout);
            serde_json::from_str(s.trim()).unwrap_or_default()
        }
        _ => vec![],
    }
}
