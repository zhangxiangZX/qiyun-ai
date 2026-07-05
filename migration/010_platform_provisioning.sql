-- Platform admin role and customer workspace provisioning (MVP A-01 / A-02)

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS platform_role TEXT NULL;

ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS website TEXT NULL,
  ADD COLUMN IF NOT EXISTS plan TEXT NULL,
  ADD COLUMN IF NOT EXISTS contact_name TEXT NULL,
  ADD COLUMN IF NOT EXISTS contact_email TEXT NULL,
  ADD COLUMN IF NOT EXISTS contact_phone TEXT NULL,
  ADD COLUMN IF NOT EXISTS provisioned_by_user_id TEXT NULL REFERENCES users(id);

CREATE INDEX IF NOT EXISTS idx_workspaces_provisioned_by
  ON workspaces (provisioned_by_user_id);
