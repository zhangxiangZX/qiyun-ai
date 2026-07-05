CREATE TABLE IF NOT EXISTS knowledge_bases (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  deleted_at TIMESTAMPTZ NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_knowledge_bases_workspace_name_active
  ON knowledge_bases (workspace_id, lower(name))
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  knowledge_base_id TEXT NOT NULL REFERENCES knowledge_bases(id),
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  storage_key TEXT NOT NULL,
  size_bytes BIGINT NOT NULL,
  status TEXT NOT NULL,
  chunk_count INTEGER NULL,
  error_message TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  deleted_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_documents_kb_status
  ON documents (knowledge_base_id, status);

CREATE TABLE IF NOT EXISTS bots (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL,
  knowledge_base_ids JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_bots_workspace
  ON bots (workspace_id);

CREATE TABLE IF NOT EXISTS document_chunks (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  knowledge_base_id TEXT NOT NULL,
  document_id TEXT NOT NULL REFERENCES documents(id),
  document_title TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_document_chunks_scope
  ON document_chunks (workspace_id, knowledge_base_id, document_id);

CREATE TABLE IF NOT EXISTS sites (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  bot_id TEXT NOT NULL REFERENCES bots(id),
  name TEXT NOT NULL,
  site_key TEXT NOT NULL UNIQUE,
  allowed_domains JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sites_workspace_bot
  ON sites (workspace_id, bot_id);

CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  bot_id TEXT NOT NULL REFERENCES bots(id),
  visitor_id TEXT NOT NULL,
  origin TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  status TEXT NULL,
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  assignee TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_conversations_scope_created
  ON conversations (workspace_id, bot_id, created_at DESC);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  bot_id TEXT NOT NULL REFERENCES bots(id),
  conversation_id TEXT NOT NULL REFERENCES conversations(id),
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
  ON messages (conversation_id, created_at);

CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  bot_id TEXT NOT NULL REFERENCES bots(id),
  conversation_id TEXT NOT NULL REFERENCES conversations(id),
  site_key TEXT NOT NULL,
  fields JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  assignee TEXT NULL,
  notes TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_leads_workspace_status_created
  ON leads (workspace_id, status, created_at DESC);
