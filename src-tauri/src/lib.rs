mod migrations;
mod tasks;

use tauri::{Emitter, Manager, menu::MenuBuilder, tray::TrayIconBuilder};

fn reveal_main_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();
    }
}

fn reveal_reminder_window(app: &tauri::AppHandle) {
    let _ = tasks::force_show_pinned_reminder(app);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:taskflow.db", migrations::core_schema())
                .build(),
        )
        .manage(tasks::PinnedReminderState::default())
        .setup(|app| {
            let menu = MenuBuilder::new(app)
                .text("quick_add", "Quick Add")
                .text("show", "Show TaskFlow")
                .text("show_reminder", "Show reminder")
                .separator()
                .text("quit", "Quit TaskFlow")
                .build()?;
            let icon = app
                .default_window_icon()
                .cloned()
                .ok_or("Missing application icon")?;
            TrayIconBuilder::with_id("taskflow-tray")
                .icon(icon)
                .tooltip("TaskFlow")
                .menu(&menu)
                .on_menu_event(|app, event| match event.id().as_ref() {
                    "quick_add" => {
                        reveal_main_window(app);
                        let _ = app.emit("quick-add", ());
                    }
                    "show" => reveal_main_window(app),
                    "show_reminder" => reveal_reminder_window(app),
                    "quit" => app.exit(0),
                    _ => {}
                })
                .build(app)?;
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .invoke_handler(tauri::generate_handler![
            tasks::create_task,
            tasks::get_app_settings,
            tasks::save_app_settings,
            tasks::run_retention_cleanup,
            tasks::get_pinned_reminder,
            tasks::update_pinned_reminder,
            tasks::set_pinned_reminder_compact,
            tasks::set_pinned_reminder_switching,
            tasks::set_pinned_reminder_content_height,
            tasks::is_reminder_snoozed,
            tasks::snooze_pinned_reminder,
            tasks::complete_reminder_active,
            tasks::resume_reminder_task,
            tasks::hide_pinned_reminder,
            tasks::show_pinned_reminder,
            tasks::open_main_window,
            tasks::start_task,
            tasks::switch_task,
            tasks::complete_task,
            tasks::mark_task_done,
            tasks::list_backlog_tasks,
            tasks::list_history_tasks,
            tasks::list_history_page,
            tasks::list_task_activity,
            tasks::list_carryover_tasks,
            tasks::move_task_to_backlog,
            tasks::move_task_to_today,
            tasks::list_today_tasks,
            tasks::reorder_tasks,
            tasks::update_task,
            tasks::delete_task
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
