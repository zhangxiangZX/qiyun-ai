CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  bot_id TEXT NOT NULL,
  visitor_id TEXT NOT NULL,
  origin TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS conversations_workspace_created_idx
  ON conversations (workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS conversations_workspace_bot_created_idx
  ON conversations (workspace_id, bot_id, created_at DESC);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  bot_id TEXT NOT NULL,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS messages_conversation_created_idx
  ON messages (conversation_id, created_at);

CREATE INDEX IF NOT EXISTS messages_workspace_bot_created_idx
  ON messages (workspace_id, bot_id, created_at DESC);

CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  bot_id TEXT NOT NULL,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  site_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS leads_workspace_created_idx
  ON leads (workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS leads_workspace_bot_created_idx
  ON leads (workspace_id, bot_id, created_at DESC);

CREATE TABLE IF NOT EXISTS lead_fields (
  lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  field_key TEXT NOT NULL,
  field_value TEXT NOT NULL,
  PRIMARY KEY (lead_id, field_key)
);
