use super::fs::{is_allowed, ExecResult};
use std::process::Stdio;
use std::time::Duration;
use tokio::process::Command;
use tokio::time::timeout;

#[tauri::command]
pub async fn shell_exec(
    cmd: String,
    args: Vec<String>,
    cwd: Option<String>,
    timeout_ms: Option<u64>,
) -> Result<ExecResult, String> {
    if !is_allowed(&cmd) {
        return Err(format!("command not allowlisted: {cmd}"));
    }

    let mut command = Command::new(&cmd);
    command
        .args(&args)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    if let Some(dir) = cwd {
        command.current_dir(dir);
    }

    let duration = Duration::from_millis(timeout_ms.unwrap_or(30_000));
    let output = timeout(duration, command.output())
        .await
        .map_err(|_| "command timed out".to_string())?
        .map_err(|e| e.to_string())?;

    Ok(ExecResult {
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
        code: output.status.code().unwrap_or(1),
    })
}

fn extract_version(tool: &str, raw: &str) -> String {
    let first = raw.lines().next().unwrap_or(raw).trim();
    let re_num = |s: &str| -> Option<String> {
        let bytes = s.as_bytes();
        let mut start = None;
        for (i, b) in bytes.iter().enumerate() {
            if b.is_ascii_digit() {
                start = Some(i);
                break;
            }
        }
        let start = start?;
        let slice = &s[start..];
        let end = slice
            .find(|c: char| !(c.is_ascii_digit() || c == '.'))
            .unwrap_or(slice.len());
        let ver = &slice[..end];
        if ver.contains('.') {
            Some(ver.to_string())
        } else {
            None
        }
    };

    match tool {
        "composer" => {
            // "Composer version 2.10.2 2026-..."
            first
                .split_whitespace()
                .find(|p| p.chars().next().map(|c| c.is_ascii_digit()).unwrap_or(false))
                .map(|s| s.to_string())
                .or_else(|| re_num(first))
                .unwrap_or_else(|| first.to_string())
        }
        "swift" => {
            // "Apple Swift version 6.3.3 (swiftlang-...)"
            if let Some(idx) = first.to_lowercase().find("swift version") {
                let after = &first[idx + "swift version".len()..];
                re_num(after).unwrap_or_else(|| first.to_string())
            } else {
                re_num(first).unwrap_or_else(|| first.to_string())
            }
        }
        "pod" | "cocoapods" => re_num(first).unwrap_or_else(|| first.to_string()),
        "cargo" => {
            // "cargo 1.97.1 (....)"
            first
                .split_whitespace()
                .nth(1)
                .map(|s| s.to_string())
                .or_else(|| re_num(first))
                .unwrap_or_else(|| first.to_string())
        }
        "go" => {
            // "go version go1.22.0 darwin/arm64"
            if let Some(idx) = first.find("go1") {
                re_num(&first[idx + 2..]).unwrap_or_else(|| first.to_string())
            } else {
                re_num(first).unwrap_or_else(|| first.to_string())
            }
        }
        "flutter" => {
            // "Flutter 3.x.x • channel ..."
            first
                .split_whitespace()
                .nth(1)
                .map(|s| s.to_string())
                .or_else(|| re_num(first))
                .unwrap_or_else(|| first.to_string())
        }
        "bundle" | "bundler" => re_num(first).unwrap_or_else(|| first.to_string()),
        "gradle" => {
            // Multi-line: "Gradle 8.x"
            if let Some(line) = raw.lines().find(|l| l.to_lowercase().contains("gradle ")) {
                re_num(line).unwrap_or_else(|| first.to_string())
            } else {
                re_num(first).unwrap_or_else(|| first.to_string())
            }
        }
        _ => first.to_string(),
    }
}

async fn version_of(cmd: &str, args: &[&str]) -> Option<String> {
    let result = shell_exec(
        cmd.to_string(),
        args.iter().map(|s| s.to_string()).collect(),
        None,
        Some(8_000),
    )
    .await
    .ok()?;
    // Some tools print version to stderr (swift sometimes)
    let raw = if result.stdout.trim().is_empty() {
        result.stderr
    } else {
        result.stdout
    };
    if result.code != 0 && raw.trim().is_empty() {
        return None;
    }
    let ver = extract_version(cmd, &raw);
    // Reject non-version junk (e.g. yarn Berry "This project is configured…")
    let looks_like_version = ver.chars().any(|c| c.is_ascii_digit())
        && !ver.to_lowercase().contains("this project")
        && !ver.to_lowercase().contains("not found")
        && ver != "—"
        && !ver.is_empty();
    if looks_like_version {
        Some(ver)
    } else {
        None
    }
}

#[tauri::command]
pub async fn tools_versions() -> serde_json::Value {
    let tools = [
        ("npm", "npm", vec!["--version"]),
        ("yarn", "yarn", vec!["--version"]),
        ("pnpm", "pnpm", vec!["--version"]),
        ("composer", "composer", vec!["--version", "--no-ansi"]),
        ("swift", "swift", vec!["--version"]),
        ("cocoapods", "pod", vec!["--version"]),
        ("gradle", "gradle", vec!["--version"]),
        ("flutter", "flutter", vec!["--version"]),
        ("go", "go", vec!["version"]),
        ("cargo", "cargo", vec!["--version"]),
        ("bundler", "bundle", vec!["--version"]),
    ];

    let mut map = serde_json::Map::new();
    for (key, cmd, args) in tools {
        let args_owned: Vec<&str> = args;
        match version_of(cmd, &args_owned).await {
            Some(v) => {
                map.insert(key.to_string(), serde_json::Value::String(v));
            }
            None => {
                map.insert(key.to_string(), serde_json::Value::Bool(false));
            }
        };
    }
    serde_json::Value::Object(map)
}

#[cfg(test)]
mod tests {
    use super::extract_version;

    #[test]
    fn extracts_composer_version() {
        assert_eq!(
            extract_version(
                "composer",
                "Composer version 2.10.2 2026-07-01 11:24:45"
            ),
            "2.10.2"
        );
    }

    #[test]
    fn extracts_swift_version() {
        assert_eq!(
            extract_version(
                "swift",
                "Apple Swift version 6.3.3 (swiftlang-6.3.3.1.3 clang-2100.1.1.101)"
            ),
            "6.3.3"
        );
    }

    #[test]
    fn extracts_cargo_version() {
        assert_eq!(
            extract_version("cargo", "cargo 1.97.1 (c980f4866 2026-06-30) (Homebrew)"),
            "1.97.1"
        );
    }

    #[test]
    fn extracts_gradle_from_multiline() {
        let raw = "\nWelcome to Gradle 8.14.2!\n\nHere are the highlights...\n";
        assert_eq!(extract_version("gradle", raw), "8.14.2");
    }
}
