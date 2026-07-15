-- Migration 030: 企业空间扩展资料（company_profile JSONB）
--
-- 将企业资料（简介、地址、开票信息、品牌展示等）以单个 JSONB 文档存储，
-- 避免新增 20+ 列导致 schema 膨胀，并保持前向兼容（后续可直接加字段）。

alter table workspaces
  add column if not exists company_profile jsonb not null default '{}'::jsonb;

comment on column workspaces.company_profile is
  'Extended enterprise profile fields stored as a JSONB document (intro, address, invoice info, brand info, etc.).';
