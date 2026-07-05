ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS follow_up_records JSONB NOT NULL DEFAULT '[]'::jsonb;
