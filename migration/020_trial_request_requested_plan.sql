ALTER TABLE trial_requests
  ADD COLUMN IF NOT EXISTS requested_plan TEXT NULL;
