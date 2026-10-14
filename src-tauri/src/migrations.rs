use tauri_plugin_sql::{Migration, MigrationKind};

pub fn core_schema() -> Vec<Migration> {
    vec![
        Migration {
            version: 1,
            description: "create TaskFlow core schema",
            sql: include_str!("../migrations/0001_core.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "add reminder delivery audit",
            sql: include_str!("../migrations/0002_reminders.sql"),
            kind: MigrationKind::Up,
        },
    ]
}
