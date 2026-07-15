CREATE TABLE IF NOT EXISTS inquiries (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  conversation_id TEXT NOT NULL,
  lead_id TEXT NULL,
  bot_id TEXT NOT NULL,
  source_code TEXT NULL,
  source_type TEXT NOT NULL DEFAULT 'other',
  intent_level TEXT NOT NULL DEFAULT 'low',
  requirement_completeness INTEGER NOT NULL DEFAULT 0,
  needs_engineer BOOLEAN NOT NULL DEFAULT FALSE,
  summary TEXT NULL,
  missing_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  risk_notes JSONB NOT NULL DEFAULT '[]'::jsonb,
  known_fields JSONB NOT NULL DEFAULT '{}'::jsonb,
  owner_id TEXT NULL,
  next_action_at TIMESTAMPTZ NULL,
  quote_status TEXT NOT NULL DEFAULT 'none',
  status TEXT NOT NULL DEFAULT 'open',
  customer_name TEXT NULL,
  customer_contact TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_inquiries_workspace_status
  ON inquiries (workspace_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_inquiries_workspace_intent
  ON inquiries (workspace_id, intent_level, updated_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uq_inquiries_conversation
  ON inquiries (conversation_id);

CREATE TABLE IF NOT EXISTS quote_opportunities (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  inquiry_id TEXT NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  stage TEXT NOT NULL DEFAULT 'collecting',
  estimated_amount NUMERIC(14, 2) NULL,
  quoted_amount NUMERIC(14, 2) NULL,
  won_amount NUMERIC(14, 2) NULL,
  lost_reason TEXT NULL,
  quote_due_at TIMESTAMPTZ NULL,
  owner_id TEXT NULL,
  next_follow_up_at TIMESTAMPTZ NULL,
  title TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_quote_opportunities_workspace_stage
  ON quote_opportunities (workspace_id, stage, updated_at DESC);

CREATE TABLE IF NOT EXISTS quote_follow_ups (
  id TEXT PRIMARY KEY,
  quote_opportunity_id TEXT NOT NULL REFERENCES quote_opportunities(id) ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'note',
  title TEXT NOT NULL,
  body TEXT NULL,
  actor TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_quote_follow_ups_quote
  ON quote_follow_ups (quote_opportunity_id, created_at DESC);

CREATE TABLE IF NOT EXISTS source_codes (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  code TEXT NOT NULL,
  label TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'other',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_source_codes_workspace_code
  ON source_codes (workspace_id, lower(code));

CREATE TABLE IF NOT EXISTS business_rules (
  workspace_id TEXT PRIMARY KEY,
  rules JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL
);
