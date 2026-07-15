-- Migration 034: 个人账户扩展资料（account_profile JSONB）

alter table users
  add column if not exists account_profile jsonb not null default '{}'::jsonb;

comment on column users.account_profile is
  'Per-user account settings (phone, job title, bio, notification preferences, language).';
