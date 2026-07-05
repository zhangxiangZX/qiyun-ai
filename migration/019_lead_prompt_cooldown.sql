alter table conversations
  add column if not exists ai_last_lead_prompt_at timestamptz;
