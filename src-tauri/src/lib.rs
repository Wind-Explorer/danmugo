use tauri::menu::{Menu, MenuItem};
use tauri::tray::TrayIconBuilder;
use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![])
        .setup(|app| {
            let main_app_window = app.get_webview_window("main").unwrap();
            main_app_window.set_ignore_cursor_events(true).unwrap();
            let main_window_clone = main_app_window.clone();
            main_app_window.on_window_event(move |event| {
                if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                    // Prevent the window from closing
                    api.prevent_close();
                    // Hide the window instead
                    main_window_clone.hide().unwrap();
                }
            });

            // 创建菜单项
            let open_config_item =
                MenuItem::with_id(app, "open_config", "Configure Danmugo", true, None::<&str>)?;
            let show_main_item =
                MenuItem::with_id(app, "show_main", "Show Damnu", true, None::<&str>)?;
            let hide_main_item =
                MenuItem::with_id(app, "hide_main", "Hide Damnu", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(
                app,
                &[
                    &open_config_item,
                    &show_main_item,
                    &hide_main_item,
                    &quit_item,
                ],
            )?;

            // 创建系统托盘
            let _tray = TrayIconBuilder::new()
                .menu(&menu)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "open_config" => {
                        // 检查窗口是否已存在，若不存在则创建
                        if app.get_webview_window("configuration").is_none() {
                            let _ = WebviewWindowBuilder::new(
                                app,
                                "configuration",
                                WebviewUrl::App("/configuration".into()),
                            )
                            .title("Configuration")
                            .inner_size(800.0, 600.0)
                            .build();
                        } else if let Some(win) = app.get_webview_window("configuration") {
                            let _ = win.show();
                            let _ = win.set_focus();
                        }
                    }
                    "show_main" => {
                        if let Some(main_win) = app.get_webview_window("main") {
                            let _ = main_win.show();
                            let _ = main_win.set_focus();
                        }
                    }
                    "hide_main" => {
                        if let Some(main_win) = app.get_webview_window("main") {
                            let _ = main_win.hide();
                        }
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .build(app)?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
