CREATE TABLE IF NOT EXISTS notification_reads (
  workspace_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  notification_id TEXT NOT NULL,
  read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (workspace_id, user_id, notification_id)
);

CREATE INDEX IF NOT EXISTS idx_notification_reads_workspace_user
  ON notification_reads (workspace_id, user_id);
