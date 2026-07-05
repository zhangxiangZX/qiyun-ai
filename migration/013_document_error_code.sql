alter table documents
  add column if not exists error_code text null;
