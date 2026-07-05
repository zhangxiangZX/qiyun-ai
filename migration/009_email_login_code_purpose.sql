ALTER TABLE email_login_codes
  ADD COLUMN IF NOT EXISTS purpose TEXT NOT NULL DEFAULT 'login';

CREATE INDEX IF NOT EXISTS idx_email_login_codes_email_purpose_created
  ON email_login_codes (email, purpose, created_at DESC);
