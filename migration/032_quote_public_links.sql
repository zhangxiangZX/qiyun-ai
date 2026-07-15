CREATE TABLE IF NOT EXISTS quote_public_links (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  quote_opportunity_id TEXT NOT NULL REFERENCES quote_opportunities(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  token_prefix TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_by TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  last_accessed_at TIMESTAMPTZ NULL,
  confirmed_at TIMESTAMPTZ NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_quote_public_links_quote
  ON quote_public_links (quote_opportunity_id);

CREATE INDEX IF NOT EXISTS idx_quote_public_links_workspace
  ON quote_public_links (workspace_id, created_at DESC);
