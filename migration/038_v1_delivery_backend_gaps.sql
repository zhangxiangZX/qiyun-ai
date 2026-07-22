ALTER TABLE quote_opportunities
  ADD COLUMN IF NOT EXISTS line_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(8, 6) NOT NULL DEFAULT 0.13,
  ADD COLUMN IF NOT EXISTS freight_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS installation_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS other_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS currency VARCHAR(8) NOT NULL DEFAULT 'CNY';

ALTER TABLE follow_tasks
  ADD COLUMN IF NOT EXISTS note TEXT NULL;

CREATE TABLE IF NOT EXISTS quote_attachments (
  id TEXT PRIMARY KEY,
  workspace_id VARCHAR(64) NOT NULL,
  quote_opportunity_id VARCHAR(64) NOT NULL REFERENCES quote_opportunities(id) ON DELETE CASCADE,
  storage_key TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL DEFAULT 'application/octet-stream',
  size_bytes INTEGER NOT NULL,
  created_by VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_quote_attachments_quote
  ON quote_attachments(workspace_id, quote_opportunity_id, created_at DESC);

ALTER TABLE quote_delivery_logs
  ADD COLUMN IF NOT EXISTS subject TEXT NULL,
  ADD COLUMN IF NOT EXISTS message_body TEXT NULL,
  ADD COLUMN IF NOT EXISTS attachment_ids JSONB NOT NULL DEFAULT '[]'::jsonb;
