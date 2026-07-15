-- 029_tenant_row_level_security.sql
-- 模块 18：多租户隔离纵深防御（PostgreSQL Row-Level Security）
--
-- 作用：为所有带 workspace_id 的业务表启用行级安全，策略强制
--   workspace_id = current_setting('app.workspace_id', true)::text
-- 即任何未携带正确租户上下文的查询都只能看到自己 workspace 的行，
-- 即使应用层某处漏写 WHERE workspace_id 也不会越权。
--
-- 部署门禁（重要）：
--   本迁移默认【不启用】RLS。需显式开启：
--   1) 确认应用层已为每条租户查询注入 app.workspace_id（本仓已完成：db/pg.ts + NestAuthContextService.resolve + 公开路由站点解析）。
--   2) 用连接选项开启开关后跑迁移，例如 DATABASE_URL 追加 "?options=-c%20app.enable_tenant_rls=true"
--      或手动：SET app.enable_tenant_rls='true'; 然后执行本文件。
--   未设置 app.enable_tenant_rls 时，迁移仅打印 NOTICE 并跳过，不影响现有行为。
--
-- 设计要点：
--   - 使用 FORCE ROW LEVEL SECURITY（强制）：表 owner 与超级用户之外的所有角色（含应用连接角色）
--     都受策略约束。若仅用 ENABLE（非 FORCE），表 owner（即跑迁移/连库的应用角色）会天然绕过，
--     RLS 形同虚设——故必须 FORCE。
--   - 迁移自身以 app.bypass_rls='true' 旁路执行（见 db/migrate.ts），不受 FORCE RLS 影响。
--   - app.bypass_rls='true' 为受控旁路，仅供 listAllChunks / syncStoredChunks 等显式跨租户内部操作使用。
--   - 动态发现所有含 workspace_id 的列，自动覆盖现有表与未来新增表，避免漏表。
--   - 幂等：先 DROP POLICY IF EXISTS 再 CREATE。

DO $$
DECLARE
  enabled text := current_setting('app.enable_tenant_rls', true);
  tbl text;
BEGIN
  IF enabled IS DISTINCT FROM 'true' THEN
    RAISE NOTICE 'tenant RLS: skipped (set app.enable_tenant_rls=true to enable).';
    RETURN;
  END IF;

  FOR tbl IN
    SELECT DISTINCT c.table_name
    FROM information_schema.columns c
    WHERE c.column_name = 'workspace_id'
      AND c.table_schema = 'public'
      AND c.table_name NOT IN ('schema_migrations', 'migrations')
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', tbl);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', tbl);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I FOR ALL TO PUBLIC USING ('
      ' workspace_id = current_setting(''app.workspace_id'', true)::text'
      ' OR current_setting(''app.bypass_rls'', true) = ''true'''
      ' ) WITH CHECK ('
      ' workspace_id = current_setting(''app.workspace_id'', true)::text'
      ' OR current_setting(''app.bypass_rls'', true) = ''true'''
      ' )',
      tbl
    );
    RAISE NOTICE 'tenant RLS: enabled on %', tbl;
  END LOOP;
END $$;
