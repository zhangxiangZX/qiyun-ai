-- Independent quote attachments (drawings, BOMs, supporting docs)
CREATE TABLE IF NOT EXISTS quote_attachments (
  id TEXT PRIMARY KEY,
  workspace_id VARCHAR(64) NOT NULL,
  quote_opportunity_id VARCHAR(64) NOT NULL REFERENCES quote_opportunities(id) ON DELETE CASCADE,
  storage_key TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL DEFAULT 'application/octet-stream',
  size_bytes INTEGER NOT NULL,
  content_hash VARCHAR(64) NOT NULL,
  created_by VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quote_attachments_quote
  ON quote_attachments (workspace_id, quote_opportunity_id);
