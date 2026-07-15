CREATE TABLE IF NOT EXISTS selection_submission_attachments (
  submission_id VARCHAR(64) NOT NULL REFERENCES selection_submissions(id) ON DELETE CASCADE,
  workspace_id VARCHAR(64) NOT NULL,
  file_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (submission_id, file_id)
);

CREATE TABLE IF NOT EXISTS follow_tasks (
  id TEXT PRIMARY KEY,
  workspace_id VARCHAR(64) NOT NULL,
  inquiry_id VARCHAR(64) REFERENCES inquiries(id) ON DELETE CASCADE,
  assignee_user_id VARCHAR(64),
  title TEXT NOT NULL,
  kind VARCHAR(32) NOT NULL DEFAULT 'follow_up',
  priority VARCHAR(16) NOT NULL DEFAULT 'medium',
  status VARCHAR(16) NOT NULL DEFAULT 'pending',
  due_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  completion_result TEXT,
  delay_reason TEXT,
  cancel_reason TEXT,
  created_by VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_follow_tasks_workspace_due ON follow_tasks(workspace_id, status, due_at);
CREATE INDEX IF NOT EXISTS idx_follow_tasks_inquiry ON follow_tasks(workspace_id, inquiry_id);

CREATE TABLE IF NOT EXISTS follow_up_records (
  id TEXT PRIMARY KEY,
  workspace_id VARCHAR(64) NOT NULL,
  inquiry_id VARCHAR(64) NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  task_id TEXT REFERENCES follow_tasks(id) ON DELETE SET NULL,
  actor_user_id VARCHAR(64),
  contact_method VARCHAR(24) NOT NULL DEFAULT 'other',
  content TEXT NOT NULL,
  result TEXT,
  next_action_at TIMESTAMPTZ,
  attachment_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_follow_records_inquiry ON follow_up_records(workspace_id, inquiry_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS quote_documents (
  id TEXT PRIMARY KEY,
  workspace_id VARCHAR(64) NOT NULL,
  quote_opportunity_id VARCHAR(64) NOT NULL REFERENCES quote_opportunities(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  storage_key TEXT NOT NULL,
  file_name TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  content_hash VARCHAR(64) NOT NULL,
  created_by VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (quote_opportunity_id, version)
);

CREATE TABLE IF NOT EXISTS quote_delivery_logs (
  id TEXT PRIMARY KEY,
  workspace_id VARCHAR(64) NOT NULL,
  quote_opportunity_id VARCHAR(64) NOT NULL REFERENCES quote_opportunities(id) ON DELETE CASCADE,
  quote_document_id TEXT REFERENCES quote_documents(id) ON DELETE SET NULL,
  channel VARCHAR(24) NOT NULL,
  recipient TEXT NOT NULL,
  status VARCHAR(24) NOT NULL,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  delivered_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS role_permissions (
  workspace_id VARCHAR(64) NOT NULL,
  role VARCHAR(32) NOT NULL,
  permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_by VARCHAR(64),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, role)
);

CREATE TABLE IF NOT EXISTS report_exports (
  id TEXT PRIMARY KEY,
  workspace_id VARCHAR(64) NOT NULL,
  report_type VARCHAR(32) NOT NULL,
  format VARCHAR(16) NOT NULL DEFAULT 'csv',
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  status VARCHAR(24) NOT NULL DEFAULT 'pending',
  storage_key TEXT,
  file_name TEXT,
  size_bytes INTEGER,
  error_message TEXT,
  created_by VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_report_exports_workspace ON report_exports(workspace_id, created_at DESC);
