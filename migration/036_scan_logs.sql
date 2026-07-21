-- migration/036_scan_logs.sql
create table if not exists scan_logs (
  id varchar(64) primary key,
  workspace_id varchar(64) not null,
  sales_link_id varchar(64) not null,
  source varchar(32) not null default 'link',
  visitor varchar(128),
  referer text,
  user_agent text,
  scanned_at timestamp with time zone not null default now()
);

create index if not exists idx_scan_logs_workspace on scan_logs(workspace_id);
create index if not exists idx_scan_logs_link on scan_logs(workspace_id, sales_link_id, scanned_at desc);
