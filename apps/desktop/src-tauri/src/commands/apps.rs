use serde::Serialize;
use std::process::Command;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InstalledAppDto {
    pub id: String,
    pub name: String,
    pub version: String,
    pub platform: String,
    pub path: Option<String>,
    pub status: String,
    pub latest_version: Option<String>,
    pub update_available: bool,
    pub update_command: Option<String>,
    pub update_source: Option<String>,
}

#[tauri::command]
pub async fn installed_apps_scan() -> Result<Vec<InstalledAppDto>, String> {
    #[cfg(target_os = "macos")]
    {
        return scan_macos();
    }
    #[cfg(target_os = "windows")]
    {
        return scan_windows();
    }
    #[cfg(target_os = "linux")]
    {
        return scan_linux();
    }
    #[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
    {
        Ok(vec![])
    }
}

#[cfg(target_os = "macos")]
fn scan_macos() -> Result<Vec<InstalledAppDto>, String> {
    let output = Command::new("system_profiler")
        .args(["SPApplicationsDataType", "-json"])
        .output()
        .map_err(|e| e.to_string())?;
    if !output.status.success() {
        return Err("system_profiler failed".into());
    }
    let json: serde_json::Value =
        serde_json::from_slice(&output.stdout).map_err(|e| e.to_string())?;
    let mut apps = Vec::new();
    if let Some(items) = json
        .get("SPApplicationsDataType")
        .and_then(|v| v.as_array())
    {
        for item in items.iter().take(400) {
            let name = item
                .get("_name")
                .and_then(|v| v.as_str())
                .unwrap_or("Unknown")
                .to_string();
            let version = item
                .get("version")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let path = item
                .get("path")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());
            let id = format!(
                "macos:{}:{}",
                name.to_lowercase().replace(' ', "-"),
                path.clone().unwrap_or_default()
            );
            apps.push(InstalledAppDto {
                id,
                name,
                version,
                platform: "darwin".into(),
                path,
                status: "unknown".into(),
                latest_version: None,
                update_available: false,
                update_command: None,
                update_source: Some("system_profiler".into()),
            });
        }
    }

    // Enrich with brew outdated casks when available
    if let Ok(out) = Command::new("brew").args(["outdated", "--cask", "--json=v2"]).output() {
        if out.status.success() {
            if let Ok(v) = serde_json::from_slice::<serde_json::Value>(&out.stdout) {
                if let Some(casks) = v.get("casks").and_then(|c| c.as_array()) {
                    for cask in casks {
                        let name = cask
                            .get("name")
                            .and_then(|n| n.as_array())
                            .and_then(|a| a.first())
                            .and_then(|x| x.as_str())
                            .unwrap_or("")
                            .to_string();
                        let current = cask
                            .get("installed_versions")
                            .and_then(|n| n.as_array())
                            .and_then(|a| a.first())
                            .and_then(|x| x.as_str())
                            .unwrap_or("")
                            .to_string();
                        let latest = cask
                            .get("current_version")
                            .and_then(|x| x.as_str())
                            .unwrap_or("")
                            .to_string();
                        if name.is_empty() {
                            continue;
                        }
                        apps.push(InstalledAppDto {
                            id: format!("brew-cask:{name}"),
                            name: name.clone(),
                            version: current,
                            platform: "darwin".into(),
                            path: None,
                            status: "outdated".into(),
                            latest_version: Some(latest),
                            update_available: true,
                            update_command: Some(format!("brew upgrade --cask {name}")),
                            update_source: Some("brew".into()),
                        });
                    }
                }
            }
        }
    }

    Ok(apps)
}

#[cfg(target_os = "windows")]
fn scan_windows() -> Result<Vec<InstalledAppDto>, String> {
    let output = Command::new("winget")
        .args(["list", "--accept-source-agreements"])
        .output()
        .map_err(|e| e.to_string())?;
    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut apps = Vec::new();
    for line in stdout.lines().skip(2).take(300) {
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() < 2 {
            continue;
        }
        let name = parts[0].to_string();
        let version = parts.get(parts.len().saturating_sub(2)).unwrap_or(&"").to_string();
        apps.push(InstalledAppDto {
            id: format!("winget:{name}"),
            name: name.clone(),
            version,
            platform: "win32".into(),
            path: None,
            status: "unknown".into(),
            latest_version: None,
            update_available: false,
            update_command: Some(format!("winget upgrade {name}")),
            update_source: Some("winget".into()),
        });
    }
    Ok(apps)
}

#[cfg(target_os = "linux")]
fn scan_linux() -> Result<Vec<InstalledAppDto>, String> {
    let mut apps = Vec::new();
    if let Ok(out) = Command::new("flatpak").args(["list", "--app", "--columns=application,name,version"]).output() {
        let stdout = String::from_utf8_lossy(&out.stdout);
        for line in stdout.lines().take(300) {
            let cols: Vec<&str> = line.split('\t').collect();
            if cols.len() < 2 {
                continue;
            }
            let id = cols[0].to_string();
            let name = cols.get(1).unwrap_or(&cols[0]).to_string();
            let version = cols.get(2).copied().unwrap_or("").to_string();
            apps.push(InstalledAppDto {
                id: format!("flatpak:{id}"),
                name,
                version,
                platform: "linux".into(),
                path: None,
                status: "unknown".into(),
                latest_version: None,
                update_available: false,
                update_command: Some(format!("flatpak update {id}")),
                update_source: Some("flatpak".into()),
            });
        }
    }
    Ok(apps)
}
