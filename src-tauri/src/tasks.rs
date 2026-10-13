use chrono::Utc;
use rusqlite::{Connection, OptionalExtension, Transaction, params};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};
use uuid::Uuid;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Task {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub priority: String,
    pub status: String,
    pub location: String,
    pub planned_date: Option<String>,
    pub queue_position: f64,
    pub last_progress_note: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub completed_at: Option<String>,
    pub obsolete_at: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskActivity {
    pub id: String,
    pub kind: String,
    pub occurred_at: String,
    pub detail: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateTaskInput {
    pub title: String,
    pub description: Option<String>,
    pub priority: String,
    pub location: String,
    pub planned_date: Option<String>,
    pub queue_position: Option<f64>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SwitchTaskInput {
    pub next_task_id: String,
    pub progress_note: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReorderTasksInput {
    pub task_ids: Vec<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateTaskInput {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub priority: String,
    pub progress_note: Option<String>,
}

fn now() -> String {
    Utc::now().to_rfc3339()
}

fn database(app: &AppHandle) -> Result<Connection, String> {
    let directory = app
        .path()
        .app_config_dir()
        .map_err(|error| error.to_string())?;
    std::fs::create_dir_all(&directory).map_err(|error| error.to_string())?;
    let connection =
        Connection::open(directory.join("taskflow.db")).map_err(|error| error.to_string())?;
    connection
        .execute_batch("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;")
        .map_err(|error| error.to_string())?;
    Ok(connection)
}

fn task_from_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<Task> {
    Ok(Task {
        id: row.get("id")?,
        title: row.get("title")?,
        description: row.get("description")?,
        priority: row.get("priority")?,
        status: row.get("status")?,
        location: row.get("location")?,
        planned_date: row.get("planned_date")?,
        queue_position: row.get("queue_position")?,
        last_progress_note: row.get("last_progress_note")?,
        created_at: row.get("created_at")?,
        updated_at: row.get("updated_at")?,
        completed_at: row.get("completed_at")?,
        obsolete_at: row.get("obsolete_at")?,
    })
}

fn find_task(tx: &Transaction<'_>, task_id: &str) -> rusqlite::Result<Option<Task>> {
    tx.query_row(
        "SELECT * FROM tasks WHERE id = ?1",
        [task_id],
        task_from_row,
    )
    .optional()
}

fn task_list(connection: &Connection, sql: &str, date: &str) -> rusqlite::Result<Vec<Task>> {
    let mut statement = connection.prepare(sql)?;
    statement
        .query_map([date], task_from_row)?
        .collect::<rusqlite::Result<Vec<_>>>()
}

fn task_list_without_params(connection: &Connection, sql: &str) -> rusqlite::Result<Vec<Task>> {
    let mut statement = connection.prepare(sql)?;
    statement
        .query_map([], task_from_row)?
        .collect::<rusqlite::Result<Vec<_>>>()
}

fn add_event(
    tx: &Transaction<'_>,
    task_id: &str,
    event_type: &str,
    timestamp: &str,
    payload: &str,
) -> rusqlite::Result<String> {
    let id = Uuid::new_v4().to_string();
    tx.execute("INSERT INTO task_events (id, task_id, event_type, occurred_at, payload_json) VALUES (?1, ?2, ?3, ?4, ?5)", params![id, task_id, event_type, timestamp, payload])?;
    Ok(id)
}

#[tauri::command]
pub fn create_task(app: AppHandle, input: CreateTaskInput) -> Result<Task, String> {
    let title = input.title.trim();
    if title.is_empty() {
        return Err("Task title is required.".into());
    }
    let timestamp = now();
    let id = Uuid::new_v4().to_string();
    let mut connection = database(&app)?;
    let tx = connection
        .transaction()
        .map_err(|error| error.to_string())?;
    tx.execute("INSERT INTO tasks (id, title, description, priority, status, location, planned_date, queue_position, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, 'todo', ?5, ?6, ?7, ?8, ?8)", params![id, title, input.description, input.priority, input.location, input.planned_date, input.queue_position.unwrap_or(0.0), timestamp]).map_err(|error| error.to_string())?;
    add_event(&tx, &id, "created", &timestamp, "{}").map_err(|error| error.to_string())?;
    let task = find_task(&tx, &id)
        .map_err(|error| error.to_string())?
        .ok_or("Task was not created.")?;
    tx.commit().map_err(|error| error.to_string())?;
    Ok(task)
}

#[tauri::command]
pub fn start_task(app: AppHandle, task_id: String) -> Result<Task, String> {
    let timestamp = now();
    let mut connection = database(&app)?;
    let tx = connection
        .transaction()
        .map_err(|error| error.to_string())?;
    let active: Option<String> = tx
        .query_row(
            "SELECT id FROM tasks WHERE status = 'in_progress'",
            [],
            |row| row.get(0),
        )
        .optional()
        .map_err(|error| error.to_string())?;
    if let Some(active_id) = active {
        if active_id != task_id {
            return Err("Pause or switch the active task first.".into());
        }
    }
    let task = find_task(&tx, &task_id)
        .map_err(|error| error.to_string())?
        .ok_or("Task not found.")?;
    if task.status == "in_progress" {
        tx.commit().map_err(|error| error.to_string())?;
        return Ok(task);
    }
    if task.status != "todo" && task.status != "pending" {
        return Err("Only To Do or Pending tasks can be started.".into());
    }
    let event = if task.status == "pending" {
        "resumed"
    } else {
        "started"
    };
    tx.execute(
        "UPDATE tasks SET status = 'in_progress', updated_at = ?1 WHERE id = ?2",
        params![timestamp, task_id],
    )
    .map_err(|error| error.to_string())?;
    add_event(&tx, &task_id, event, &timestamp, "{}").map_err(|error| error.to_string())?;
    let updated = find_task(&tx, &task_id)
        .map_err(|error| error.to_string())?
        .ok_or("Task not found.")?;
    tx.commit().map_err(|error| error.to_string())?;
    Ok(updated)
}

#[tauri::command]
pub fn switch_task(app: AppHandle, input: SwitchTaskInput) -> Result<Task, String> {
    let timestamp = now();
    let mut connection = database(&app)?;
    let tx = connection
        .transaction()
        .map_err(|error| error.to_string())?;
    let current_id: String = tx
        .query_row(
            "SELECT id FROM tasks WHERE status = 'in_progress'",
            [],
            |row| row.get(0),
        )
        .optional()
        .map_err(|error| error.to_string())?
        .ok_or("There is no active task to switch.")?;
    if current_id == input.next_task_id {
        return Err("The selected task is already active.".into());
    }
    let next = find_task(&tx, &input.next_task_id)
        .map_err(|error| error.to_string())?
        .ok_or("Next task not found.")?;
    if next.status != "todo" && next.status != "pending" {
        return Err("Only To Do or Pending tasks can be started.".into());
    }
    let progress_note = input
        .progress_note
        .and_then(|note| (!note.trim().is_empty()).then(|| note.trim().to_owned()));
    let pause_event_id = add_event(&tx, &current_id, "paused", &timestamp, "{}")
        .map_err(|error| error.to_string())?;
    let note_id = if let Some(note) = &progress_note {
        let id = Uuid::new_v4().to_string();
        tx.execute("INSERT INTO task_notes (id, task_id, content, created_at, source_event_id) VALUES (?1, ?2, ?3, ?4, ?5)", params![id, current_id, note, timestamp, pause_event_id]).map_err(|error| error.to_string())?;
        Some(id)
    } else {
        None
    };
    tx.execute("UPDATE tasks SET status = 'pending', last_progress_note = ?1, updated_at = ?2 WHERE id = ?3", params![progress_note, timestamp, current_id]).map_err(|error| error.to_string())?;
    let event = if next.status == "pending" {
        "resumed"
    } else {
        "started"
    };
    tx.execute(
        "UPDATE tasks SET status = 'in_progress', updated_at = ?1 WHERE id = ?2",
        params![timestamp, input.next_task_id],
    )
    .map_err(|error| error.to_string())?;
    add_event(&tx, &input.next_task_id, event, &timestamp, "{}")
        .map_err(|error| error.to_string())?;
    tx.execute("INSERT INTO interruptions (id, interrupted_task_id, interrupting_task_id, started_at, note_id) VALUES (?1, ?2, ?3, ?4, ?5)", params![Uuid::new_v4().to_string(), current_id, input.next_task_id, timestamp, note_id]).map_err(|error| error.to_string())?;
    let updated = find_task(&tx, &input.next_task_id)
        .map_err(|error| error.to_string())?
        .ok_or("Task not found.")?;
    tx.commit().map_err(|error| error.to_string())?;
    Ok(updated)
}

#[tauri::command]
pub fn complete_task(app: AppHandle, task_id: String) -> Result<(), String> {
    let timestamp = now();
    let mut connection = database(&app)?;
    let tx = connection
        .transaction()
        .map_err(|error| error.to_string())?;
    let task = find_task(&tx, &task_id)
        .map_err(|error| error.to_string())?
        .ok_or("Task not found.")?;
    if task.status != "in_progress" {
        return Err("Only the active task can be completed.".into());
    }
    tx.execute(
        "UPDATE tasks SET status = 'done', completed_at = ?1, updated_at = ?1 WHERE id = ?2",
        params![timestamp, task_id],
    )
    .map_err(|error| error.to_string())?;
    add_event(&tx, &task_id, "completed", &timestamp, "{}").map_err(|error| error.to_string())?;
    tx.commit().map_err(|error| error.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn mark_task_done(app: AppHandle, task_id: String) -> Result<(), String> {
    let timestamp = now();
    let mut connection = database(&app)?;
    let tx = connection
        .transaction()
        .map_err(|error| error.to_string())?;
    let task = find_task(&tx, &task_id)
        .map_err(|error| error.to_string())?
        .ok_or("Task not found.")?;
    if task.status == "done" {
        return Err("This task is already done.".into());
    }
    tx.execute(
        "UPDATE tasks SET status = 'done', completed_at = ?1, updated_at = ?1 WHERE id = ?2",
        params![timestamp, task_id],
    )
    .map_err(|error| error.to_string())?;
    add_event(
        &tx,
        &task_id,
        "completed",
        &timestamp,
        "{\"source\":\"manual\"}",
    )
    .map_err(|error| error.to_string())?;
    tx.commit().map_err(|error| error.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn list_backlog_tasks(app: AppHandle) -> Result<Vec<Task>, String> {
    let connection = database(&app)?;
    task_list_without_params(
        &connection,
        "SELECT * FROM tasks WHERE location = 'backlog' AND status IN ('todo', 'pending') ORDER BY updated_at DESC",
    )
    .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn list_history_tasks(app: AppHandle) -> Result<Vec<Task>, String> {
    let connection = database(&app)?;
    task_list_without_params(
        &connection,
        "SELECT * FROM tasks WHERE status IN ('done', 'obsolete') ORDER BY COALESCE(completed_at, obsolete_at, updated_at) DESC",
    )
    .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn list_task_activity(app: AppHandle, task_id: String) -> Result<Vec<TaskActivity>, String> {
    let connection = database(&app)?;
    let mut statement = connection
        .prepare(
            "SELECT id, event_type AS kind, occurred_at, NULL AS detail FROM task_events WHERE task_id = ?1
             UNION ALL
             SELECT id, 'progress_note' AS kind, created_at AS occurred_at, content AS detail FROM task_notes WHERE task_id = ?1
             ORDER BY occurred_at DESC",
        )
        .map_err(|error| error.to_string())?;
    statement
        .query_map([task_id], |row| {
            Ok(TaskActivity {
                id: row.get("id")?,
                kind: row.get("kind")?,
                occurred_at: row.get("occurred_at")?,
                detail: row.get("detail")?,
            })
        })
        .map_err(|error| error.to_string())?
        .collect::<rusqlite::Result<Vec<_>>>()
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn list_carryover_tasks(app: AppHandle, date: String) -> Result<Vec<Task>, String> {
    let timestamp = now();
    let mut connection = database(&app)?;
    let tx = connection
        .transaction()
        .map_err(|error| error.to_string())?;

    let stale_active_ids = {
        let mut statement = tx
            .prepare("SELECT id FROM tasks WHERE location = 'today' AND planned_date < ?1 AND status = 'in_progress'")
            .map_err(|error| error.to_string())?;
        statement
            .query_map([&date], |row| row.get::<_, String>(0))
            .map_err(|error| error.to_string())?
            .collect::<rusqlite::Result<Vec<_>>>()
            .map_err(|error| error.to_string())?
    };
    for task_id in stale_active_ids {
        tx.execute(
            "UPDATE tasks SET status = 'pending', updated_at = ?1 WHERE id = ?2",
            params![timestamp, task_id],
        )
        .map_err(|error| error.to_string())?;
        add_event(&tx, &task_id, "carried_over_from_active", &timestamp, "{}")
            .map_err(|error| error.to_string())?;
    }

    let tasks = {
        let mut statement = tx
            .prepare("SELECT * FROM tasks WHERE location = 'today' AND planned_date < ?1 AND status IN ('todo', 'pending') ORDER BY planned_date ASC, queue_position ASC")
            .map_err(|error| error.to_string())?;
        statement
            .query_map([&date], task_from_row)
            .map_err(|error| error.to_string())?
            .collect::<rusqlite::Result<Vec<_>>>()
            .map_err(|error| error.to_string())?
    };
    tx.commit().map_err(|error| error.to_string())?;
    Ok(tasks)
}

#[tauri::command]
pub fn move_task_to_backlog(app: AppHandle, task_id: String) -> Result<(), String> {
    let timestamp = now();
    let mut connection = database(&app)?;
    let tx = connection
        .transaction()
        .map_err(|error| error.to_string())?;
    let task = find_task(&tx, &task_id)
        .map_err(|error| error.to_string())?
        .ok_or("Task not found.")?;
    if task.status == "in_progress" {
        return Err("Switch or complete the active task before moving it to backlog.".into());
    }
    tx.execute(
        "UPDATE tasks SET location = 'backlog', planned_date = NULL, updated_at = ?1 WHERE id = ?2",
        params![timestamp, task_id],
    )
    .map_err(|error| error.to_string())?;
    add_event(&tx, &task_id, "moved_to_backlog", &timestamp, "{}")
        .map_err(|error| error.to_string())?;
    tx.commit().map_err(|error| error.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn move_task_to_today(
    app: AppHandle,
    task_id: String,
    date: String,
    queue_position: f64,
) -> Result<(), String> {
    let timestamp = now();
    let mut connection = database(&app)?;
    let tx = connection
        .transaction()
        .map_err(|error| error.to_string())?;
    let task = find_task(&tx, &task_id)
        .map_err(|error| error.to_string())?
        .ok_or("Task not found.")?;
    if task.status != "todo" && task.status != "pending" {
        return Err("Only To Do or Pending tasks can be planned for today.".into());
    }
    tx.execute("UPDATE tasks SET location = 'today', planned_date = ?1, queue_position = ?2, updated_at = ?3 WHERE id = ?4", params![date, queue_position, timestamp, task_id]).map_err(|error| error.to_string())?;
    add_event(&tx, &task_id, "moved_to_today", &timestamp, "{}")
        .map_err(|error| error.to_string())?;
    tx.commit().map_err(|error| error.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn list_today_tasks(app: AppHandle, date: String) -> Result<Vec<Task>, String> {
    let connection = database(&app)?;
    task_list(
        &connection,
        "SELECT * FROM tasks WHERE location = 'today' AND planned_date = ?1 AND status IN ('todo', 'pending', 'in_progress') ORDER BY CASE status WHEN 'in_progress' THEN 0 ELSE 1 END, queue_position ASC",
        &date,
    )
    .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn reorder_tasks(app: AppHandle, input: ReorderTasksInput) -> Result<(), String> {
    let mut connection = database(&app)?;
    let tx = connection
        .transaction()
        .map_err(|error| error.to_string())?;
    let timestamp = now();
    for (position, task_id) in input.task_ids.iter().enumerate() {
        let changed = tx
            .execute(
                "UPDATE tasks SET queue_position = ?1, updated_at = ?2 WHERE id = ?3 AND status IN ('todo', 'pending')",
                params![position as f64, timestamp, task_id],
            )
            .map_err(|error| error.to_string())?;
        if changed != 1 {
            return Err("A queue task could not be reordered.".into());
        }
    }
    tx.commit().map_err(|error| error.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn update_task(app: AppHandle, input: UpdateTaskInput) -> Result<Task, String> {
    let title = input.title.trim();
    if title.is_empty() {
        return Err("Task title is required.".into());
    }
    let timestamp = now();
    let mut connection = database(&app)?;
    let tx = connection
        .transaction()
        .map_err(|error| error.to_string())?;
    let existing = find_task(&tx, &input.id)
        .map_err(|error| error.to_string())?
        .ok_or("Task not found.")?;
    let changed = tx.execute("UPDATE tasks SET title = ?1, description = ?2, priority = ?3, updated_at = ?4 WHERE id = ?5", params![title, input.description, input.priority, timestamp, input.id]).map_err(|error| error.to_string())?;
    if changed != 1 {
        return Err("Task not found.".into());
    }
    add_event(&tx, &input.id, "updated", &timestamp, "{}").map_err(|error| error.to_string())?;
    if existing.status == "pending" {
        if let Some(note) = input.progress_note {
            let note = note.trim().to_owned();
            let note_value = (!note.is_empty()).then_some(note.clone());
            tx.execute(
                "UPDATE tasks SET last_progress_note = ?1, updated_at = ?2 WHERE id = ?3",
                params![note_value, timestamp, input.id],
            )
            .map_err(|error| error.to_string())?;
            if !note.is_empty() {
                let event_id = add_event(&tx, &input.id, "progress_note_updated", &timestamp, "{}")
                    .map_err(|error| error.to_string())?;
                tx.execute("INSERT INTO task_notes (id, task_id, content, created_at, source_event_id) VALUES (?1, ?2, ?3, ?4, ?5)", params![Uuid::new_v4().to_string(), input.id, note, timestamp, event_id]).map_err(|error| error.to_string())?;
            }
        }
    }
    let task = find_task(&tx, &input.id)
        .map_err(|error| error.to_string())?
        .ok_or("Task not found.")?;
    tx.commit().map_err(|error| error.to_string())?;
    Ok(task)
}

#[tauri::command]
pub fn delete_task(app: AppHandle, task_id: String) -> Result<(), String> {
    let mut connection = database(&app)?;
    let tx = connection
        .transaction()
        .map_err(|error| error.to_string())?;
    let task = find_task(&tx, &task_id)
        .map_err(|error| error.to_string())?
        .ok_or("Task not found.")?;
    if task.status == "in_progress" {
        return Err("Complete or switch the active task before deleting it.".into());
    }
    tx.execute("DELETE FROM tasks WHERE id = ?1", [task_id])
        .map_err(|error| error.to_string())?;
    tx.commit().map_err(|error| error.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn mark_task_obsolete(app: AppHandle, task_id: String) -> Result<(), String> {
    let timestamp = now();
    let mut connection = database(&app)?;
    let tx = connection
        .transaction()
        .map_err(|error| error.to_string())?;
    let task = find_task(&tx, &task_id)
        .map_err(|error| error.to_string())?
        .ok_or("Task not found.")?;
    if task.status == "in_progress" {
        return Err("Complete or switch the active task before marking it obsolete.".into());
    }
    tx.execute(
        "UPDATE tasks SET status = 'obsolete', obsolete_at = ?1, updated_at = ?1 WHERE id = ?2",
        params![timestamp, task_id],
    )
    .map_err(|error| error.to_string())?;
    add_event(&tx, &task_id, "obsolete", &timestamp, "{}").map_err(|error| error.to_string())?;
    tx.commit().map_err(|error| error.to_string())?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use rusqlite::Connection;

    #[test]
    fn schema_allows_only_one_active_task() {
        let connection = Connection::open_in_memory().expect("open in-memory SQLite");
        connection
            .execute_batch(include_str!("../migrations/0001_core.sql"))
            .expect("apply TaskFlow schema");
        connection
            .execute("INSERT INTO tasks (id, title, status, created_at, updated_at) VALUES ('a', 'A', 'in_progress', 'now', 'now')", [])
            .expect("insert first active task");
        let second_insert = connection.execute("INSERT INTO tasks (id, title, status, created_at, updated_at) VALUES ('b', 'B', 'in_progress', 'now', 'now')", []);
        assert!(second_insert.is_err());
    }
}
