use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

const MAX_ITEMS: usize = 50;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HistoryEntry {
    pub id: String,
    /// history ディレクトリからの相対ファイル名 (例: "….png")
    pub file: String,
    pub label: String,
    pub width: u32,
    pub height: u32,
    pub created_at: u64,
}

#[derive(Debug, Default, Serialize, Deserialize)]
struct HistoryIndex {
    entries: Vec<HistoryEntry>,
}

fn history_dir() -> PathBuf {
    let base = dirs_next::data_dir().unwrap_or_else(|| PathBuf::from("/tmp"));
    let dir = base.join("pashatt").join("history");
    let _ = std::fs::create_dir_all(&dir);
    dir
}

fn index_path() -> PathBuf {
    history_dir().join("index.json")
}

fn load_index() -> HistoryIndex {
    let path = index_path();
    let Ok(bytes) = std::fs::read(&path) else {
        return HistoryIndex::default();
    };
    serde_json::from_slice(&bytes).unwrap_or_default()
}

fn save_index(index: &HistoryIndex) -> Result<(), String> {
    let path = index_path();
    let bytes = serde_json::to_vec_pretty(index).map_err(|e| e.to_string())?;
    std::fs::write(&path, bytes).map_err(|e| e.to_string())
}

fn format_now_label() -> String {
    std::process::Command::new("/bin/date")
        .arg("+%m/%d %H:%M:%S")
        .output()
        .ok()
        .and_then(|o| {
            if o.status.success() {
                Some(String::from_utf8_lossy(&o.stdout).trim().to_string())
            } else {
                None
            }
        })
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| "capture".to_string())
}

fn now_secs() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0)
}

/// キャプチャ画像を履歴に追加（新しいものが先頭）。上限超過分は削除。
pub fn add_capture(source: &Path, width: u32, height: u32) -> Result<HistoryEntry, String> {
    let dir = history_dir();
    let id = format!(
        "{}",
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_nanos())
            .unwrap_or(0)
    );
    let file = format!("{id}.png");
    let dest = dir.join(&file);
    std::fs::copy(source, &dest).map_err(|e| format!("history copy failed: {e}"))?;

    let entry = HistoryEntry {
        id: id.clone(),
        file,
        label: format_now_label(),
        width,
        height,
        created_at: now_secs(),
    };

    let mut index = load_index();
    index.entries.insert(0, entry.clone());

    while index.entries.len() > MAX_ITEMS {
        if let Some(old) = index.entries.pop() {
            let _ = std::fs::remove_file(dir.join(&old.file));
        }
    }

    save_index(&index)?;
    Ok(entry)
}

pub fn list() -> Vec<HistoryEntry> {
    load_index().entries
}

pub fn absolute_path(entry: &HistoryEntry) -> PathBuf {
    history_dir().join(&entry.file)
}

pub fn path_for_id(id: &str) -> Option<PathBuf> {
    let index = load_index();
    index
        .entries
        .iter()
        .find(|e| e.id == id)
        .map(absolute_path)
        .filter(|p| p.is_file())
}

pub fn clear() -> Result<(), String> {
    let dir = history_dir();
    let index = load_index();
    for entry in &index.entries {
        let _ = std::fs::remove_file(dir.join(&entry.file));
    }
    save_index(&HistoryIndex::default())?;
    Ok(())
}
