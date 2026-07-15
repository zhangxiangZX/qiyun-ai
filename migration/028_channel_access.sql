-- 渠道接入申请：记录每个工作区对各流量渠道（官网 Widget / 企业微信 / 抖音 / 小红书 等）
-- 的接入申请与审核状态。渠道目录（名称、图标、是否全局可用）为静态配置，存于代码层；
-- 本表仅持久化每工作区的接入申请。
create table if not exists channel_access (
  id text primary key,
  workspace_id text not null,
  channel_id text not null,
  status text not null default 'requested',
  requested_by text,
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  review_note text,
  unique (workspace_id, channel_id)
);

create index if not exists idx_channel_access_workspace
  on channel_access (workspace_id);
