alter table leads
  add column if not exists attachments jsonb not null default '[]'::jsonb;
