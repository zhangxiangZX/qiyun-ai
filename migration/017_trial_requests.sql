CREATE TABLE IF NOT EXISTS trial_requests (
  id TEXT PRIMARY KEY,
  company_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NULL,
  website TEXT NULL,
  requirement TEXT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  processed_by_user_id TEXT NULL REFERENCES users(id),
  processed_at TIMESTAMPTZ NULL,
  review_notes TEXT NULL,
  approved_workspace_id TEXT NULL REFERENCES workspaces(id),
  approved_invitation_id TEXT NULL REFERENCES workspace_invitations(id),
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_trial_requests_status_created_at
  ON trial_requests (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_trial_requests_email_pending
  ON trial_requests (lower(email), status);
