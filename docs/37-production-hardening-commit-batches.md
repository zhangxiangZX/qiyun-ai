# Production hardening commit batches

Do not use `git add .` in the current worktree. Stage each batch explicitly and
review `git diff --cached` before committing.

## Batch 1 - Tenant security and schema

Commit: `fix(db): enforce tenant RLS and add production workflow tables`

- `migration/034_selection_submission_conversion.sql`
- `migration/035_v1_production_workflows.sql`
- `migration/036_enable_tenant_rls_all_tables.sql`
- `migration/037_enforce_tenant_rls.sql`
- `apps/api/src/db/tenant-context.ts`
- `apps/api/src/db/pg.ts`

## Batch 2 - Selection, follow-up, reports and role APIs

Commit: `feat(api): complete selection follow-up report and role workflows`

- `apps/api/src/selection-pages/**`
- `apps/api/src/calendar/**`
- `apps/api/src/nest/selection-pages/**`
- `apps/api/src/nest/calendar/**`
- `apps/api/src/nest/analytics/**`
- `apps/api/src/nest/auth/workspace-route.service.ts`
- `apps/api/src/runtime.ts`

## Batch 3 - Quote PDF and delivery

Commit: `feat(quotes): archive Chinese PDF quotes and deliver by email`

- `apps/api/src/sales/quote-pdf.ts`
- `apps/api/src/sales/quote-pdf.test.ts`
- `apps/api/src/sales/quote-mailer.ts`
- `apps/api/src/nest/sales/sales-route.service.ts`
- `apps/api/package.json`
- `pnpm-lock.yaml`

## Batch 4 - Live infrastructure verification

Commit: `test(integration): verify postgres redis qdrant and minio`

- `apps/api/src/integration/platform-integration.test.ts`
- `migration/037_enforce_tenant_rls.sql`

## Batch 5 - Console integration and build fixes

Commit: `fix(console): align live workflow contracts and installation status`

- `apps/console/src/lib/follow-tasks/api.ts`
- `apps/console/src/lib/sites/api.ts`
- `apps/console/src/components/sites/website-widget-workspace.tsx`
- `apps/console/src/components/sales/inquiry-module-nav.tsx`
- `apps/console/src/components/sales/inquiries-workspace.tsx`
- `apps/console/src/components/settings/account-settings-workspace.tsx`
- `apps/console/src/components/team/invite-member-workspace.tsx`
- `apps/console/src/components/team/enterprise-profile-edit-workspace.tsx`
- `apps/console/src/components/team/role-permissions-workspace.tsx`
- `apps/console/src/app/layout.tsx`

## Verification before each push

```powershell
pnpm --filter qiyun-api typecheck
pnpm --filter qiyun-api lint
pnpm --filter qiyun-api test
pnpm --filter qiyun-console typecheck
pnpm --filter qiyun-console lint
pnpm --filter qiyun-console test
pnpm --filter qiyun-console build
```

For live dependencies, load the root `.env`, set
`QIYUN_INTEGRATION_TEST=1`, build the API, and run `test:integration`.
