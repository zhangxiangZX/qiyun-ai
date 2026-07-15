-- Tenant isolation is mandatory in production. The application already sets
-- app.workspace_id per authenticated request and uses an explicit bypass only
-- for trusted cross-tenant maintenance operations.
DO $$
DECLARE
  tbl text;
BEGIN
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
