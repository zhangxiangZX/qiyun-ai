alter table conversations
  add column if not exists ai_intent text,
  add column if not exists ai_product_line text,
  add column if not exists ai_confidence real,
  add column if not exists ai_missing_fields jsonb not null default '[]'::jsonb,
  add column if not exists ai_lead_capture_recommended boolean,
  add column if not exists ai_suggested_questions jsonb not null default '[]'::jsonb,
  add column if not exists ai_high_intent_turn_count integer not null default 0,
  add column if not exists ai_last_evaluated_at timestamptz;
