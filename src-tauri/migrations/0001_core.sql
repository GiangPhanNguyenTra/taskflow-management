CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL CHECK(length(trim(title)) > 0),
  description TEXT, priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('urgent','high','medium','low')),
  status TEXT NOT NULL DEFAULT 'todo' CHECK(status IN ('todo','in_progress','pending','done','obsolete')),
  location TEXT NOT NULL DEFAULT 'today' CHECK(location IN ('today','backlog')),
  planned_date TEXT, queue_position REAL NOT NULL DEFAULT 0, last_progress_note TEXT,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL, completed_at TEXT, obsolete_at TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS one_task_in_progress ON tasks(status) WHERE status = 'in_progress';
CREATE INDEX IF NOT EXISTS tasks_today_queue_idx ON tasks(location, planned_date, queue_position);
CREATE TABLE IF NOT EXISTS task_events (id TEXT PRIMARY KEY NOT NULL, task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE, event_type TEXT NOT NULL, occurred_at TEXT NOT NULL, payload_json TEXT NOT NULL DEFAULT '{}');
CREATE INDEX IF NOT EXISTS task_events_task_idx ON task_events(task_id, occurred_at DESC);
CREATE TABLE IF NOT EXISTS task_notes (id TEXT PRIMARY KEY NOT NULL, task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE, content TEXT NOT NULL, created_at TEXT NOT NULL, source_event_id TEXT REFERENCES task_events(id) ON DELETE SET NULL);
CREATE TABLE IF NOT EXISTS interruptions (id TEXT PRIMARY KEY NOT NULL, interrupted_task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE, interrupting_task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE, started_at TEXT NOT NULL, resolved_at TEXT, note_id TEXT REFERENCES task_notes(id) ON DELETE SET NULL);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY NOT NULL, value_json TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS daily_reviews (id TEXT PRIMARY KEY NOT NULL, review_date TEXT NOT NULL UNIQUE, completed_at TEXT NOT NULL, summary_json TEXT NOT NULL DEFAULT '{}');
