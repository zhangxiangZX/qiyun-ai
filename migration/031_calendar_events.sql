CREATE TABLE IF NOT EXISTS calendar_events (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  title TEXT NOT NULL,
  start TIMESTAMPTZ NOT NULL,
  "end" TIMESTAMPTZ NOT NULL,
  kind TEXT NOT NULL DEFAULT 'follow_up',
  status TEXT NOT NULL DEFAULT 'pending',
  lead_id TEXT NULL,
  lead_name TEXT NULL,
  owner_name TEXT NULL,
  note TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_calendar_events_workspace
  ON calendar_events (workspace_id, start ASC);

CREATE INDEX IF NOT EXISTS idx_calendar_events_workspace_range
  ON calendar_events (workspace_id, start, "end");
