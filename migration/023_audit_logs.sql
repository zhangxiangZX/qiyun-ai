-- 审计日志：覆盖创建/编辑/删除/状态变更/导出/发送报价等业务动作
-- 所有业务表已按 workspace_id（= 文档 tenant_id）隔离，审计表同样归属 workspace_id。

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null,
  user_id text,
  module text not null,
  action text not null,
  target_id text,
  ip text,
  detail jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_logs_workspace_created
  on audit_logs (workspace_id, created_at desc);
create index if not exists idx_audit_logs_target
  on audit_logs (workspace_id, module, target_id);
