CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE sites
  ADD COLUMN IF NOT EXISTS site_key_prefix TEXT NULL;

UPDATE sites
SET site_key_hash = encode(digest(site_key, 'sha256'), 'hex')
WHERE site_key IS NOT NULL
  AND (site_key_hash IS NULL OR site_key_hash = '');

UPDATE sites
SET site_key_prefix = left(site_key, 12)
WHERE site_key IS NOT NULL
  AND (site_key_prefix IS NULL OR site_key_prefix = '');

ALTER TABLE sites
  ALTER COLUMN site_key DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_sites_site_key_hash
  ON sites (site_key_hash)
  WHERE site_key_hash IS NOT NULL;

UPDATE sites
SET site_key = NULL
WHERE site_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS site_key_audits (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL REFERENCES sites(id),
  workspace_id TEXT NOT NULL,
  actor_user_id TEXT NULL REFERENCES users(id),
  action TEXT NOT NULL,
  site_key_prefix TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_site_key_audits_site_created
  ON site_key_audits (site_id, created_at DESC);
