-- 报价模板：JSON 配置存储，按工作区隔离
CREATE TABLE IF NOT EXISTS quote_templates (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  template_name TEXT NOT NULL,
  company_name TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  theme_color TEXT NOT NULL DEFAULT '#1677ff',
  logo_position TEXT NOT NULL DEFAULT 'left',
  show_company_info BOOLEAN NOT NULL DEFAULT TRUE,
  show_customer_info BOOLEAN NOT NULL DEFAULT TRUE,
  fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  terms JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_quote_templates_workspace
  ON quote_templates (workspace_id, updated_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uq_quote_templates_workspace_default
  ON quote_templates (workspace_id)
  WHERE is_default = TRUE;

ALTER TABLE quote_opportunities
  ADD COLUMN IF NOT EXISTS template_id TEXT NULL REFERENCES quote_templates(id) ON DELETE SET NULL;
