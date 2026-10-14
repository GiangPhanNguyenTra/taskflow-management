CREATE TABLE IF NOT EXISTS reminder_deliveries (
  id TEXT PRIMARY KEY NOT NULL,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  delivered_at TEXT NOT NULL,
  channel TEXT NOT NULL CHECK(channel IN ('popup', 'notification'))
);
CREATE INDEX IF NOT EXISTS reminder_deliveries_task_idx ON reminder_deliveries(task_id, delivered_at DESC);
