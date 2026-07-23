use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HotkeyConfig {
    pub screenshot: String,
}

impl Default for HotkeyConfig {
    fn default() -> Self {
        Self {
            screenshot: "Command+Shift+Space".to_string(),
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
    /// "system" | "english" | "japanese"
    #[serde(default = "default_app_language")]
    pub app_language: String,
    /// "system" | "light" | "dark"
    #[serde(default = "default_app_appearance")]
    pub app_appearance: String,
}

fn default_app_language() -> String {
    "system".to_string()
}

fn default_app_appearance() -> String {
    "system".to_string()
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
            app_language: default_app_language(),
            app_appearance: default_app_appearance(),
        }
    }
}

fn config_dir() -> PathBuf {
    let base = dirs_next::config_dir().unwrap_or_else(|| PathBuf::from("/tmp"));
    let new_dir = base.join("pashatt");
    let legacy_dir = base.join("simpleshot");

    // One-time migration from SimpleSHOT → Pashatt
    if !new_dir.exists() {
        let legacy_settings = legacy_dir.join("settings.json");
        if legacy_settings.is_file() {
            if std::fs::create_dir_all(&new_dir).is_ok() {
                let _ = std::fs::copy(&legacy_settings, new_dir.join("settings.json"));
            }
        }
    }

    std::fs::create_dir_all(&new_dir).ok();
    new_dir
}

fn config_path() -> PathBuf {
    config_dir().join("settings.json")
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
