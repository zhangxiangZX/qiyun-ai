ALTER TABLE selection_submissions
  ADD COLUMN IF NOT EXISTS attachment_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS status VARCHAR(32) NOT NULL DEFAULT 'submitted',
  ADD COLUMN IF NOT EXISTS inquiry_id VARCHAR(64),
  ADD COLUMN IF NOT EXISTS follow_task_id TEXT;

CREATE INDEX IF NOT EXISTS idx_selection_submissions_inquiry
  ON selection_submissions(inquiry_id) WHERE inquiry_id IS NOT NULL;
