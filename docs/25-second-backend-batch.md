# Second Backend Batch

Last updated: 2026-07-05

## Goal

After the docs batch lands, the next safest backend submission is:

- auth
- workspace boundaries
- platform admin / trial provisioning

This is the best second batch because it unlocks real login, workspace switching, trial approval, and super-admin review without mixing in the heavier RAG / queue / worker surface.

## Suggested Branch

```text
feature/backend-platform-hardening
```

## Suggested Commit Message

```text
feat(api): finalize auth, workspace boundaries, and platform admin flows
```

## Include These Files

### Runtime / Auth

- `apps/api/src/auth/**`
- `apps/api/src/security/**`
- `apps/api/src/workspace.ts`
- `apps/api/src/config/env.ts`
- `apps/api/src/nest/auth/**`

### Migrations

- `migration/002_auth_workspace.sql`
- `migration/003_workspace_invitations.sql`
- `migration/004_runtime_state.sql`
- `migration/008_email_login_codes.sql`
- `migration/009_email_login_code_purpose.sql`
- `migration/010_platform_provisioning.sql`
- `migration/016_fix_corrupted_user_names.sql`
- `migration/017_trial_requests.sql`

### Tests tied to this batch

- auth / login / refresh tests
- workspace invitation tests
- super-admin provisioning / trial approval tests

## Why This Is The Right Second Batch

1. It establishes the real user boundary for the rest of the product.
2. It unlocks authenticated manual acceptance.
3. It keeps data/auth concerns isolated from RAG and worker complexity.

## Must-Run Checks Before Commit

1. `apps/api` tests for auth and workspace flows
2. login / refresh / invitation / super-admin regression
3. migration ordering sanity check

## Exclude From This Batch

Do not mix in:

- `apps/api/src/chat/**`
- `apps/api/src/documents/**`
- `apps/api/src/rag/**`
- `apps/api/src/queue/**`
- `apps/api/src/integration/**`
- `apps/worker/**`
- `infra/**`

Those belong to later themed batches.
