-- migration/025b_add_missing_deleted_at.sql
-- 补齐核心业务表缺失的软删除列 deleted_at。
-- 背景：001_init 仅给极少数表定义了 deleted_at，而后续代码（repository 查询）
-- 与 026 索引优化普遍假定所有业务表均有该列，导致 026 执行时
-- 报 "column deleted_at does not exist" 并中断 migrate。本迁移在 026 之前
-- 补齐所有缺失列，解除死锁。使用 IF NOT EXISTS 幂等保护，可安全重跑。

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'audit_logs' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE audit_logs ADD COLUMN deleted_at TIMESTAMPTZ NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bots' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE bots ADD COLUMN deleted_at TIMESTAMPTZ NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'business_rules' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE business_rules ADD COLUMN deleted_at TIMESTAMPTZ NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'conversations' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE conversations ADD COLUMN deleted_at TIMESTAMPTZ NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'document_chunks' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE document_chunks ADD COLUMN deleted_at TIMESTAMPTZ NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'email_login_codes' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE email_login_codes ADD COLUMN deleted_at TIMESTAMPTZ NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'inquiries' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE inquiries ADD COLUMN deleted_at TIMESTAMPTZ NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE leads ADD COLUMN deleted_at TIMESTAMPTZ NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE messages ADD COLUMN deleted_at TIMESTAMPTZ NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'notification_reads' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE notification_reads ADD COLUMN deleted_at TIMESTAMPTZ NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'quote_follow_ups' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE quote_follow_ups ADD COLUMN deleted_at TIMESTAMPTZ NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'quote_opportunities' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE quote_opportunities ADD COLUMN deleted_at TIMESTAMPTZ NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'refresh_sessions' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE refresh_sessions ADD COLUMN deleted_at TIMESTAMPTZ NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'selection_submissions' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE selection_submissions ADD COLUMN deleted_at TIMESTAMPTZ NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'site_key_audits' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE site_key_audits ADD COLUMN deleted_at TIMESTAMPTZ NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sites' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE sites ADD COLUMN deleted_at TIMESTAMPTZ NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'source_codes' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE source_codes ADD COLUMN deleted_at TIMESTAMPTZ NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'trial_requests' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE trial_requests ADD COLUMN deleted_at TIMESTAMPTZ NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE users ADD COLUMN deleted_at TIMESTAMPTZ NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'workspace_invitations' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE workspace_invitations ADD COLUMN deleted_at TIMESTAMPTZ NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'workspace_members' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE workspace_members ADD COLUMN deleted_at TIMESTAMPTZ NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'workspaces' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE workspaces ADD COLUMN deleted_at TIMESTAMPTZ NULL;
  END IF;
END $$;
