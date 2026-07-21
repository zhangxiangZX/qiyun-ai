-- migration/025_selection_pages.sql
create table if not exists selection_pages (
  id varchar(64) primary key,
  workspace_id varchar(64) not null,
  name varchar(255) not null,
  slug varchar(128) not null,
  description text,
  config jsonb not null default '{}',
  status varchar(32) not null default 'draft',
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  deleted_at timestamp with time zone
);

create table if not exists selection_submissions (
  id varchar(64) primary key,
  selection_page_id varchar(64) not null references selection_pages(id),
  answers jsonb not null default '{}',
  contact_name varchar(255),
  contact_phone varchar(64),
  contact_email varchar(255),
  created_at timestamp with time zone not null default now()
);

create index if not exists idx_selection_pages_workspace on selection_pages(workspace_id) where deleted_at is null;
create index if not exists idx_selection_pages_slug on selection_pages(slug) where deleted_at is null;
create index if not exists idx_selection_submissions_page on selection_submissions(selection_page_id);
