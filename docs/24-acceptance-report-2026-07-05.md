# Acceptance Report 2026-07-05

## Scope

This report covers:

- bot preview write-path hardening
- console automated regression
- basic HTTP reachability checks

## Bot Preview Policy

Decision:

- preview mode is now browse-only for bot authoring
- create/save should not pretend to persist
- bot detail preview remains visible for demo purposes

Files changed:

- `apps/console/src/lib/bots/data.ts`
- `apps/console/src/lib/bots/capabilities.ts`
- `apps/console/src/components/bots/bot-section-forms.tsx`
- `apps/console/src/components/bots/bots-workspace.tsx`
- `apps/console/src/components/bots/bot-edit-shell.tsx`
- `apps/console/src/lib/bots/data.test.ts`

## Automated Results

### Console tests

- Command: `pnpm --dir apps/console test`
- Result: passed
- Summary: 87 passed, 0 failed

### Console lint

- Command: `pnpm --dir apps/console lint`
- Result: passed

### Console typecheck

- Command: `pnpm --dir apps/console typecheck`
- Result: passed

## HTTP Reachability

Checked on 2026-07-05:

- `http://localhost:3010/` → `307`
- `http://localhost:3010/login` → `200`
- `http://localhost:3010/trial` → `200`
- `http://localhost:3010/dashboard` → `307`
- `http://localhost:3010/dashboard/knowledge-bases` → `307`
- `http://localhost:3010/dashboard/bots` → `307`
- `http://localhost:3010/dashboard/conversations` → `307`
- `http://localhost:3010/dashboard/leads` → `307`
- `http://localhost:3010/dashboard/sites` → `307`
- `http://localhost:3010/dashboard/team` → `307`
- `http://localhost:3010/dashboard/reports` → `307`
- `http://localhost:3010/dashboard/system-status` → `307`
- `http://localhost:3010/dashboard/super-admin` → `307`
- `http://localhost:3001/health` → `200`

Interpretation:

- public entry pages are reachable
- protected dashboard pages are redirecting as expected for unauthenticated requests
- API health endpoint is reachable

## What Was Not Fully Executed In This Pass

The following still need browser-driven manual acceptance:

1. login after real credential entry
2. trial submission to super-admin review flow
3. knowledge upload to ready/failed lifecycle
4. widget install and allowed-domain behavior
5. real knowledge-base Q&A sales guidance flow

Use:

- `docs/21-page-acceptance-runbook.md`

## Current Verdict

Status: good for continued hardening

What improved:

1. bot preview mode no longer misrepresents fake persistence
2. console automated regression remains green
3. docs and release process are much clearer

Remaining focus:

1. run full manual page acceptance with authenticated browser session
2. unify preview/upstream wording across remaining console areas
3. submit changes in themed batches
