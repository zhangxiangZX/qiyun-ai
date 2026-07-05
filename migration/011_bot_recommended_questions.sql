ALTER TABLE bots
  ADD COLUMN IF NOT EXISTS recommended_questions JSONB NOT NULL DEFAULT '[]'::jsonb;
