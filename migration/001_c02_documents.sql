CREATE TABLE knowledge_bases (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  deleted_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX knowledge_bases_workspace_name_active_uniq
  ON knowledge_bases (workspace_id, name)
  WHERE deleted_at IS NULL;

CREATE TABLE documents (
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
  deleted_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX documents_workspace_status_idx
  ON documents (workspace_id, status, updated_at DESC);

CREATE INDEX documents_knowledge_base_status_idx
  ON documents (knowledge_base_id, status);
