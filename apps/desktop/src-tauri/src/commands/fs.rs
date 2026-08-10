use serde::Serialize;
use std::fs;
use std::path::PathBuf;
use tauri_plugin_dialog::DialogExt;

#[derive(Serialize)]
pub struct ExecResult {
    pub stdout: String,
    pub stderr: String,
    pub code: i32,
}

pub(crate) fn is_allowed(cmd: &str) -> bool {
    matches!(
        cmd,
        "npm"
            | "yarn"
            | "pnpm"
            | "composer"
            | "swift"
            | "pod"
            | "flutter"
            | "go"
            | "cargo"
            | "bundle"
            | "gem"
            | "brew"
            | "winget"
            | "flatpak"
            | "snap"
            | "gradle"
            | "./gradlew"
            | "gradlew.bat"
            | "system_profiler"
            | "powershell"
    )
}

#[tauri::command]
pub fn fs_read(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn fs_write(path: String, content: String) -> Result<(), String> {
    if let Some(parent) = PathBuf::from(&path).parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(&path, content).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn fs_exists(path: String) -> bool {
    PathBuf::from(path).exists()
}

#[tauri::command]
pub fn fs_readdir(path: String) -> Result<Vec<String>, String> {
    let entries = fs::read_dir(&path).map_err(|e| e.to_string())?;
    let mut names = Vec::new();
    for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;
        if let Some(name) = entry.file_name().to_str() {
            names.push(name.to_string());
        }
    }
    Ok(names)
}

#[tauri::command]
pub async fn project_open_dialog(app: tauri::AppHandle) -> Option<String> {
    app.dialog()
        .file()
        .blocking_pick_folder()
        .map(|p| p.to_string())
}
