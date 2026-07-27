mod apps;
mod fs;
mod icons;
mod shell;

pub use apps::*;
pub use fs::*;
pub use icons::*;
pub use shell::*;

use tauri_plugin_opener::OpenerExt;

#[tauri::command]
pub fn get_app_info() -> serde_json::Value {
    serde_json::json!({
        "name": "npMax",
        "version": env!("CARGO_PKG_VERSION"),
        "description": "Cross-platform dependency and installed app update manager",
        "copyright": "© Mehdir — Mehdi Rezaei",
        "license": "MIT",
        "homepage": "https://mehdiraized.github.io/npmax/",
        "repositoryUrl": "https://github.com/mehdiraized/npmax",
        "releasesUrl": "https://github.com/mehdiraized/npmax/releases",
        "issuesUrl": "https://github.com/mehdiraized/npmax/issues",
        "platform": std::env::consts::OS,
        "arch": std::env::consts::ARCH,
        "tauriVersion": "2",
    })
}

#[tauri::command]
pub async fn open_url(app: tauri::AppHandle, url: String) -> Result<(), String> {
    app.opener()
        .open_url(url, None::<&str>)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn path_augment() -> String {
    // Return a recommended PATH prefix; frontend/core may use tools_versions instead.
    let home = std::env::var("HOME").unwrap_or_default();
    format!(
        "/usr/local/bin:/opt/homebrew/bin:{home}/.cargo/bin:{home}/.local/bin"
    )
}
