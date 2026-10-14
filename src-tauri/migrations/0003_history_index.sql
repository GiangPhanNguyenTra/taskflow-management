CREATE INDEX IF NOT EXISTS tasks_history_closed_idx
ON tasks(status, completed_at DESC, obsolete_at DESC);
