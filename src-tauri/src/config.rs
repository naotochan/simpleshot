use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HotkeyConfig {
    pub screenshot: String,
}

impl Default for HotkeyConfig {
    fn default() -> Self {
        Self {
            screenshot: "CmdOrCtrl+Shift+Space".to_string(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    pub hotkeys: HotkeyConfig,
    pub save_directory: String,
    pub image_format: String, // "png" | "jpeg"
    pub show_cursor: bool,
    #[serde(default)]
    pub favorite_colors: Vec<String>,
}

impl Default for AppSettings {
    fn default() -> Self {
        let home = dirs_next::home_dir()
            .unwrap_or_else(|| PathBuf::from("/tmp"))
            .join("Desktop");
        Self {
            hotkeys: HotkeyConfig::default(),
            save_directory: home.to_string_lossy().to_string(),
            image_format: "png".to_string(),
            show_cursor: false,
            favorite_colors: vec![],
        }
    }
}

fn config_path() -> PathBuf {
    let config_dir = dirs_next::config_dir()
        .unwrap_or_else(|| PathBuf::from("/tmp"))
        .join("simpleshot");
    std::fs::create_dir_all(&config_dir).ok();
    config_dir.join("settings.json")
}

pub fn load_settings() -> AppSettings {
    let path = config_path();
    if let Ok(data) = std::fs::read_to_string(&path) {
        serde_json::from_str(&data).unwrap_or_default()
    } else {
        AppSettings::default()
    }
}

pub fn save_settings(settings: &AppSettings) -> Result<(), String> {
    let path = config_path();
    let data = serde_json::to_string_pretty(settings).map_err(|e| e.to_string())?;
    std::fs::write(path, data).map_err(|e| e.to_string())
}
