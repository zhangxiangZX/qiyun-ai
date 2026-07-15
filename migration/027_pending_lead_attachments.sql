-- 预上传线索附件：Widget 先上传文件拿到 pendingId，建线索时通过 pendingAttachmentIds 引用，
-- 避免大文件以 base64 直接塞进线索 POST 请求体。文件字节存对象存储（documentStorage），
-- 本表仅保存元数据与 storage_key，并在 expires_at 后由清理任务回收。
create table if not exists pending_lead_attachments (
  id text primary key,
  workspace_id text not null,
  site_key text not null,
  file_name text not null,
  file_type text not null,
  size_bytes bigint not null default 0,
  storage_key text not null,
  checksum text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists idx_pending_lead_attachments_workspace
  on pending_lead_attachments (workspace_id);

create index if not exists idx_pending_lead_attachments_expires
  on pending_lead_attachments (expires_at);
