-- Re-apply tenant RLS after all V1 production tables have been created.
-- FORCE controls table-owner behavior, but ENABLE is required to activate RLS.
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
  END LOOP;
END $$;
