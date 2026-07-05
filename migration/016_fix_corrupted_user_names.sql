-- Repair user display names corrupted by non-UTF8 registration payloads.
UPDATE users
SET
  name = CASE email
    WHEN 'owner@qiyun.ai' THEN '企业管理员'
    WHEN 'platform@qiyun.ai' THEN '平台管理员'
    ELSE split_part(email, '@', 1)
  END,
  updated_at = NOW()
WHERE name IS NULL
   OR btrim(name) = ''
   OR name ~ '^[?？]+$';

UPDATE workspaces
SET
  name = '企云演示工作区',
  updated_at = NOW()
WHERE id = 'ws_67be000a-c633-46cc-a11c-fd4020baa6ed'
   OR name ~ '^[?？]+$';
