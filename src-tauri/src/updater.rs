use tauri::AppHandle;
use tauri_plugin_dialog::{DialogExt, MessageDialogButtons, MessageDialogKind};
use tauri_plugin_updater::UpdaterExt;

/// 更新チェック。
/// - `interactive == false`: 起動時など。更新があるときだけ確認ダイアログ。エラーは黙殺。
/// - `interactive == true`: メニュー／設定から。結果を必ずダイアログで返す。
pub async fn check_for_updates(app: &AppHandle, interactive: bool) {
    let updater = match app.updater() {
        Ok(u) => u,
        Err(e) => {
            eprintln!("[updater] init failed: {e}");
            if interactive {
                show_message(
                    app,
                    MessageDialogKind::Error,
                    "Update / アップデート",
                    &format!("Updater unavailable.\nアップデータを初期化できません。\n\n{e}"),
                );
            }
            return;
        }
    };

    let update = match updater.check().await {
        Ok(u) => u,
        Err(e) => {
            eprintln!("[updater] check failed: {e}");
            if interactive {
                show_message(
                    app,
                    MessageDialogKind::Error,
                    "Update / アップデート",
                    &format!(
                        "Could not check for updates.\n更新を確認できませんでした。\n\n{e}"
                    ),
                );
            }
            return;
        }
    };

    let Some(update) = update else {
        if interactive {
            show_message(
                app,
                MessageDialogKind::Info,
                "Update / アップデート",
                "You're up to date.\n最新版です。",
            );
        }
        return;
    };

    let notes = update
        .body
        .clone()
        .unwrap_or_default()
        .trim()
        .to_string();
    let notes_block = if notes.is_empty() {
        String::new()
    } else {
        format!("\n\n{notes}")
    };

    let message = format!(
        "A new version is available: {}\n新しいバージョンがあります: {}{}\n\nDownload and install now?\n今すぐダウンロードしてインストールしますか？",
        update.version, update.version, notes_block
    );

    let confirmed = ask_confirm(
        app,
        "Update / アップデート",
        &message,
        "Update / アップデート",
        "Later / あとで",
    );

    if !confirmed {
        return;
    }

    let result = update
        .download_and_install(|_chunk_len, _content_len| {}, || {})
        .await;

    match result {
        Ok(()) => {
            show_message(
                app,
                MessageDialogKind::Info,
                "Update / アップデート",
                "Update installed. Pashatt will restart.\nアップデートをインストールしました。再起動します。",
            );
            app.restart();
        }
        Err(e) => {
            eprintln!("[updater] install failed: {e}");
            show_message(
                app,
                MessageDialogKind::Error,
                "Update / アップデート",
                &format!("Update failed.\nアップデートに失敗しました。\n\n{e}"),
            );
        }
    }
}

fn show_message(app: &AppHandle, kind: MessageDialogKind, title: &str, message: &str) {
    let (tx, rx) = std::sync::mpsc::channel();
    app.dialog()
        .message(message)
        .kind(kind)
        .title(title)
        .show(move |_| {
            let _ = tx.send(());
        });
    let _ = rx.recv();
}

fn ask_confirm(
    app: &AppHandle,
    title: &str,
    message: &str,
    ok: &str,
    cancel: &str,
) -> bool {
    let (tx, rx) = std::sync::mpsc::channel();
    app.dialog()
        .message(message)
        .kind(MessageDialogKind::Info)
        .title(title)
        .buttons(MessageDialogButtons::OkCancelCustom(
            ok.to_string(),
            cancel.to_string(),
        ))
        .show(move |answer| {
            let _ = tx.send(answer);
        });
    rx.recv().unwrap_or(false)
}
