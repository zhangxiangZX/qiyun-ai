ALTER TABLE trial_requests
  ADD COLUMN IF NOT EXISTS consent_accepted_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS consent_version TEXT NULL;
