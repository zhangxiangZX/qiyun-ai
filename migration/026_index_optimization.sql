-- migration/026_index_optimization.sql
-- P3: 补齐核心查询路径缺少的关键索引（索引优化）

-- 1. inquiries: owner_id scope（P0 sales 数据范围隔离的核心查询路径）
CREATE INDEX IF NOT EXISTS idx_inquiries_workspace_owner ON inquiries(workspace_id, owner_id)
  WHERE deleted_at IS NULL;

-- 2. quote_opportunities: owner_id scope（同上）
CREATE INDEX IF NOT EXISTS idx_quote_opportunities_workspace_owner ON quote_opportunities(workspace_id, owner_id)
  WHERE deleted_at IS NULL;

-- 3. audit_logs: 主列表查询 — workspace + 时间倒序
CREATE INDEX IF NOT EXISTS idx_audit_logs_workspace_created ON audit_logs(workspace_id, created_at DESC);

-- 4. sales_links: 列表查询 + slug 快速查找
CREATE INDEX IF NOT EXISTS idx_sales_links_workspace_status ON sales_links(workspace_id, status)
  WHERE deleted_at IS NULL;

-- 5. selection_pages: 按 workspace 列表
CREATE INDEX IF NOT EXISTS idx_selection_pages_workspace_status ON selection_pages(workspace_id, status)
  WHERE deleted_at IS NULL;

-- 6. selection_submissions: 按选型页 ID + 时间倒序
CREATE INDEX IF NOT EXISTS idx_selection_submissions_page_created ON selection_submissions(selection_page_id, created_at DESC);

-- 7. notification_reads: 未读过滤
CREATE INDEX IF NOT EXISTS idx_notification_reads_user_read ON notification_reads(workspace_id, user_id, read_at);

-- 8. leads: conversation 反查（线索 → 对话回链）
CREATE INDEX IF NOT EXISTS idx_leads_conversation ON leads(conversation_id)
  WHERE deleted_at IS NULL;

-- 9. refresh_sessions: 过期扫描
CREATE INDEX IF NOT EXISTS idx_refresh_sessions_expires ON refresh_sessions(user_id, expires_at);
