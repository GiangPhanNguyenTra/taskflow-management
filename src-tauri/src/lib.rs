mod migrations;
mod tasks;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:taskflow.db", migrations::core_schema())
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            tasks::create_task,
            tasks::start_task,
            tasks::switch_task,
            tasks::complete_task,
            tasks::mark_task_done,
            tasks::list_backlog_tasks,
            tasks::list_history_tasks,
            tasks::list_task_activity,
            tasks::list_carryover_tasks,
            tasks::move_task_to_backlog,
            tasks::move_task_to_today,
            tasks::list_today_tasks,
            tasks::reorder_tasks,
            tasks::update_task,
            tasks::delete_task,
            tasks::mark_task_obsolete
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
