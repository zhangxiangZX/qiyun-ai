# Frontend Review And Acceptance Issues

Last updated: 2026-07-05

## Scope

This note captures:

- remaining review observations from the current Console diff
- current authenticated acceptance gaps
- items worth sending to Cursor

## Fixed In This Pass

- Bot preview mode no longer pretends to persist create/save
- Site page retry now matches the failed action:
  - domain save failure retries save
  - site-key rotation failure retries rotate

## Review Findings

### P1

- `SitesWorkspace` previously reused one error slot for both save and rotate, but always retried save.
  - Status: fixed in this pass
  - File: `apps/console/src/components/sites/sites-workspace.tsx`

### P1

- Bot preview wording was previously inconsistent with actual behavior.
  - Status: partially fixed
  - Files:
    - `apps/console/src/components/bots/bots-workspace.tsx`
    - `apps/console/src/components/bots/bot-edit-shell.tsx`
  - Remaining cleanup:
    - unify text in shared message sources where old preview wording may still exist

### P2

- Some text resources still contain older preview/upstream wording or encoding noise.
  - Status: still open
  - File cluster:
    - `apps/console/src/lib/messages.ts`
    - preview/upstream copy surfaces across dashboard, sites, bots, notifications

### P2

- Dashboard and Reports still intentionally differ in fallback behavior:
  - dashboard can render preview snapshot
  - reports return `PREVIEW_MODE` when upstream is unavailable
  - Status: acceptable, but must stay clearly documented in UI

## Authenticated Acceptance Gaps

These are not known failures yet; they are still pending manual browser validation with a signed-in account.

1. Login with real owner/admin account
2. Trial request submission to super-admin review
3. Invite acceptance end-to-end
4. Knowledge upload to `ready/failed`
5. Single document delete real flow
6. Bot edit in upstream mode
7. Site key rotate reveal flow
8. Widget allowed-domain block/allow verification
9. Real KB Q&A with citation and sales guidance

## Reachability Already Verified

- `/login` returns `200`
- `/trial` returns `200`
- `/dashboard/*` redirects unauthenticated as expected
- `/health` returns `200`

## Suggested Cursor Tasks

### Task C-REVIEW-01

Unify preview/upstream wording in shared copy sources.

Scope:

- `apps/console/src/lib/messages.ts`
- `apps/console/src/lib/console/**`
- relevant UI consumers

Goal:

- ensure no page implies preview writes are real writes

### Task C-REVIEW-02

Run authenticated page acceptance using:

- `docs/21-page-acceptance-runbook.md`

Output:

- one pass/fail note per page
- exact page where blocking issue appears
- screenshot or short repro note for each failure

### Task C-REVIEW-03

Review Dashboard / Reports / Bots / Sites banners for wording consistency.

Goal:

- one mental model across all pages:
  - preview = demo / non-persistent
  - upstream = real API / persistent where supported

## Current Verdict

Console is in a good hardening state.

The biggest remaining work is no longer raw implementation.
It is:

1. authenticated page-by-page acceptance
2. wording consistency
3. merge discipline
