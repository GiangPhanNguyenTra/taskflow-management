ALTER TABLE tasks ADD COLUMN resume_at TEXT;
ALTER TABLE tasks ADD COLUMN reminder_last_sent_at TEXT;
ALTER TABLE tasks ADD COLUMN reminder_snoozed_until TEXT;
CREATE INDEX IF NOT EXISTS tasks_resume_at_idx ON tasks(status, location, resume_at);
