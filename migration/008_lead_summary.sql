-- P0-3: lead summary and source site metadata
alter table leads add column if not exists key_question text;
alter table leads add column if not exists summary text;
alter table leads add column if not exists source_site_id text;
alter table leads add column if not exists source_site_name text;
