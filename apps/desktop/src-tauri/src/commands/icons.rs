use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

use base64::{engine::general_purpose::STANDARD as B64, Engine as _};

fn find_mac_app_icon_path(app_path: &Path) -> Option<PathBuf> {
    let resolved = fs::canonicalize(app_path).ok()?;
    let info_plist = resolved.join("Contents/Info.plist");
    let resources = resolved.join("Contents/Resources");

    let mut icon_name: Option<String> = None;
    if info_plist.exists() {
        if let Ok(output) = Command::new("/usr/bin/plutil")
            .args(["-convert", "json", "-o", "-", info_plist.to_str()?])
            .output()
        {
            if output.status.success() {
                if let Ok(json) = serde_json::from_slice::<serde_json::Value>(&output.stdout) {
                    icon_name = json
                        .get("CFBundleIconFile")
                        .or_else(|| json.get("CFBundleIconName"))
                        .and_then(|v| v.as_str())
                        .map(|s| s.to_string())
                        .or_else(|| {
                            json.pointer("/CFBundleIcons/CFBundlePrimaryIcon/CFBundleIconFiles")
                                .and_then(|arr| arr.as_array())
                                .and_then(|arr| arr.last())
                                .and_then(|v| v.as_str())
                                .map(|s| s.to_string())
                        });
                }
            }
        }
    }

    let mut candidates: Vec<String> = Vec::new();
    if let Some(name) = icon_name {
        candidates.push(name.clone());
        if !name.ends_with(".icns") {
            candidates.push(format!("{name}.icns"));
        }
    }

    if resources.is_dir() {
        if let Ok(entries) = fs::read_dir(&resources) {
            for entry in entries.flatten() {
                let name = entry.file_name().to_string_lossy().to_string();
                if name.to_lowercase().ends_with(".icns") {
                    candidates.push(name);
                }
            }
        }
    }

    for candidate in candidates {
        let path = resources.join(&candidate);
        if path.exists() {
            return Some(path);
        }
    }
    None
}

fn convert_icns_to_data_url(icon_path: &Path) -> Option<String> {
    let temp_dir = std::env::temp_dir().join(format!("npmax-icon-{}", std::process::id()));
    let _ = fs::create_dir_all(&temp_dir);
    let png_path = temp_dir.join("icon.png");

    let result = (|| {
        let status = Command::new("/usr/bin/sips")
            .args([
                "-z",
                "64",
                "64",
                "-s",
                "format",
                "png",
                icon_path.to_str()?,
                "--out",
                png_path.to_str()?,
            ])
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::null())
            .status()
            .ok()?;
        if !status.success() {
            return None;
        }
        let bytes = fs::read(&png_path).ok()?;
        if bytes.is_empty() {
            return None;
        }
        Some(format!("data:image/png;base64,{}", B64.encode(bytes)))
    })();

    let _ = fs::remove_dir_all(&temp_dir);
    result
}

/// Returns a `data:image/png;base64,...` URL for a macOS `.app` bundle icon.
#[tauri::command]
pub fn get_file_icon(path: String) -> Option<String> {
    if path.trim().is_empty() {
        return None;
    }

    #[cfg(target_os = "macos")]
    {
        if path.ends_with(".app") {
            let icon = find_mac_app_icon_path(Path::new(&path))?;
            return convert_icns_to_data_url(&icon);
        }
    }

    let _ = path;
    None
}
