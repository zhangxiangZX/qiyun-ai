-- migration/024_sales_links.sql
create table if not exists sales_links (
  id varchar(64) primary key,
  workspace_id varchar(64) not null,
  name varchar(255) not null,
  slug varchar(128) not null,
  channel varchar(64) not null default 'other',
  target_url text,
  short_url text,
  status varchar(32) not null default 'active',
  visits integer not null default 0,
  inquiries integer not null default 0,
  conversions integer not null default 0,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  deleted_at timestamp with time zone
);

create index idx_sales_links_workspace on sales_links(workspace_id) where deleted_at is null;
create index idx_sales_links_slug on sales_links(slug) where deleted_at is null;
create unique index idx_sales_links_slug_active on sales_links(slug) where deleted_at is null;
