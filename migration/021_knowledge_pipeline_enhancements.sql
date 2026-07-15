ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS content_hash TEXT NULL;

ALTER TABLE document_chunks
  ADD COLUMN IF NOT EXISTS section_title TEXT NULL,
  ADD COLUMN IF NOT EXISTS chunk_index INT NULL;

CREATE INDEX IF NOT EXISTS idx_documents_kb_content_hash
  ON documents (knowledge_base_id, content_hash)
  WHERE deleted_at IS NULL AND content_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_document_chunks_document_order
  ON document_chunks (document_id, chunk_index);
