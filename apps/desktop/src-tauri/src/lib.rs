mod commands;

use tauri::image::Image;
use tauri::menu::{AboutMetadata, Menu, PredefinedMenuItem, Submenu};
use tauri::{AppHandle, Manager};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            commands::fs_read,
            commands::fs_write,
            commands::fs_exists,
            commands::fs_readdir,
            commands::project_open_dialog,
            commands::shell_exec,
            commands::tools_versions,
            commands::installed_apps_scan,
            commands::open_url,
            commands::get_app_info,
            commands::path_augment,
            commands::get_file_icon,
        ])
        .setup(|app| {
            let menu = build_app_menu(app.handle())?;
            app.set_menu(menu)?;

            if let Some(window) = app.get_webview_window("main") {
                apply_window_glass(&window);
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running npMax");
}

fn about_metadata(_app: &AppHandle) -> AboutMetadata<'static> {
    let icon = Image::from_bytes(include_bytes!("../icons/icon.png")).ok();

    AboutMetadata {
        name: Some("npMax".into()),
        version: Some(env!("CARGO_PKG_VERSION").into()),
        short_version: None,
        copyright: Some("© Mehdir — Mehdi Rezaei".into()),
        credits: Some(
            "Cross-platform dependency and installed app update manager.\n\
             Open source under the MIT License.\n\n\
             Website: https://npmax.vercel.app/\n\
             Source: https://github.com/mehdiraized/npmax"
                .into(),
        ),
        website: Some("https://npmax.vercel.app/".into()),
        website_label: Some("npMax Website".into()),
        license: Some("MIT".into()),
        authors: Some(vec!["Mehdir — Mehdi Rezaei".into()]),
        icon,
        ..Default::default()
    }
}

fn build_app_menu(app: &AppHandle) -> tauri::Result<Menu<tauri::Wry>> {
    let about = about_metadata(app);

    #[cfg(target_os = "macos")]
    let app_menu = Submenu::with_items(
        app,
        "npMax",
        true,
        &[
			&PredefinedMenuItem::about(app, Some("About npMax"), Some(about))?,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::services(app, None)?,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::hide(app, None)?,
            &PredefinedMenuItem::hide_others(app, None)?,
            &PredefinedMenuItem::show_all(app, None)?,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::quit(app, None)?,
        ],
    )?;

    #[cfg(not(target_os = "macos"))]
    let file_menu = Submenu::with_items(
        app,
        "File",
        true,
        &[
            &PredefinedMenuItem::about(app, Some("About npMax"), Some(about))?,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::quit(app, None)?,
        ],
    )?;

    let edit_menu = Submenu::with_items(
        app,
        "Edit",
        true,
        &[
            &PredefinedMenuItem::undo(app, None)?,
            &PredefinedMenuItem::redo(app, None)?,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::cut(app, None)?,
            &PredefinedMenuItem::copy(app, None)?,
            &PredefinedMenuItem::paste(app, None)?,
            &PredefinedMenuItem::select_all(app, None)?,
        ],
    )?;

    #[cfg(target_os = "macos")]
    let view_menu = Submenu::with_items(
        app,
        "View",
        true,
        &[&PredefinedMenuItem::fullscreen(app, None)?],
    )?;

    let window_menu = Submenu::with_items(
        app,
        "Window",
        true,
        &[
            &PredefinedMenuItem::minimize(app, None)?,
            &PredefinedMenuItem::maximize(app, None)?,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::close_window(app, None)?,
        ],
    )?;

    #[cfg(target_os = "macos")]
    {
        Menu::with_items(app, &[&app_menu, &edit_menu, &view_menu, &window_menu])
    }

    #[cfg(not(target_os = "macos"))]
    {
        Menu::with_items(app, &[&file_menu, &edit_menu, &window_menu])
    }
}

fn apply_window_glass(window: &tauri::WebviewWindow) {
    #[cfg(target_os = "macos")]
    {
        use tauri::window::{Effect, EffectState, EffectsBuilder};
        // Sidebar material reads closer to native macOS sidebars (ChatGPT-style).
        // Opaque `.main-pane` covers the right side so only the nav looks glassy.
        let _ = window.set_effects(
            EffectsBuilder::new()
                .effect(Effect::Sidebar)
                .state(EffectState::Active)
                .build(),
        );
    }

    #[cfg(target_os = "windows")]
    {
        use tauri::window::{Effect, EffectsBuilder};
        let _ = window.set_effects(
            EffectsBuilder::new()
                .effect(Effect::Acrylic)
                .effect(Effect::MicaDark)
                .build(),
        );
    }
}
