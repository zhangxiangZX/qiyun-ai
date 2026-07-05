# Console Upstream Audit

Last updated: 2026-07-05

## Goal

This audit focuses on one question:

Can each Console page clearly distinguish between:

- real upstream data
- intentional preview/demo mode
- blocked features that still need backend or BFF completion

The target is not to remove preview mode entirely.
The target is to ensure preview mode is honest, explicit, and never silently masquerades as real writes.

## Summary

### Already on real upstream path

- Conversations list/detail/update
- Leads list/detail/update
- Sites list/domain save/rotate key/test message
- Notifications feed
- System status
- Team / invitations
- Super admin / trial review

### Preview fallback is still intentional

- Dashboard snapshot
- Reports snapshot
- Bots list/detail
- Bot editor chat preview bootstrap

These areas still support demo mode by design. They should keep preview mode only if the UI clearly labels it and the write path does not pretend to persist upstream.

### Highest-priority cleanup remaining

1. Tighten dashboard and reports so fallback behavior is fully explicit in UI copy and acceptance docs.
2. Keep bot detail preview readable, but require upstream for create/save.
3. Keep BFF preview routes limited to demo-specific endpoints; avoid expanding them into hidden production behavior.

## File-Level Findings

## A. Dashboard / Reports

### Current behavior

- `apps/console/src/lib/dashboard/data.ts`
  - Uses upstream when Console mode is not preview.
  - Falls back to mock snapshot in preview mode.
- `apps/console/src/app/api/dashboard/route.ts`
  - If `API_BASE_URL` exists, it proxies upstream.
  - If not configured, it returns preview snapshot directly.
- `apps/console/src/lib/reports/data.ts`
  - Uses upstream when Console mode is not preview.
  - Falls back to mock snapshot in preview mode.
- `apps/console/src/app/api/reports/route.ts`
  - Returns `503 PREVIEW_MODE` when upstream is unavailable.

### Assessment

- Dashboard is demo-friendly and acceptable for preview walkthroughs.
- Reports is stricter and upstream-oriented.
- This asymmetry is acceptable only if product copy makes it obvious.

### Recommended follow-up

1. Keep Dashboard preview snapshot.
2. Keep Reports upstream-first.
3. Ensure both pages surface mode banners consistently.

## B. Bots

### Current behavior

- `apps/console/src/lib/bots/data.ts`
  - List/detail support preview mode.
  - Create/save now reject explicitly in preview mode.
  - Upstream mode uses real APIs.
  - Knowledge base options no longer silently fall back in upstream mode.

### Assessment

- This is the most important remaining mixed-mode module.
- It is usable, but still carries “editable in preview” behavior.

### Recommended follow-up

1. V1 decision finalized: preview mode is browse-only for bot authoring.
2. Create/save in preview mode must fail explicitly instead of using mock persistence.
3. UI should keep bot detail preview visible, but disable edits and saves.

## C. Conversations

### Current behavior

- `apps/console/src/lib/conversations/data.ts`
  - Read path is upstream.
  - Save path rejects preview writes explicitly.

### Assessment

- Good production posture.
- No silent persistence risk found.

## D. Leads

### Current behavior

- `apps/console/src/lib/leads/data.ts`
  - Preview mode uses mock data intentionally.
  - Upstream mode uses real APIs.
  - No silent upstream fallback for bot options.

### Assessment

- Good separation.
- Main requirement is to keep preview wording honest.

## E. Sites

### Current behavior

- `apps/console/src/lib/sites/data.ts`
  - Preview mode uses mock data intentionally.
  - Upstream mode uses real APIs for list/save/rotate/test where supported.
- `apps/console/src/app/api/sites/route.ts`
  - Returns `503 PREVIEW_MODE` if upstream is unavailable.

### Assessment

- Healthy separation.
- Demo mode is explicit.

## F. Notifications

### Current behavior

- `apps/console/src/server/notifications-feed.ts`
  - Uses upstream feed when auth token and upstream are available.
  - Falls back to preview notifications when not available.
  - Preview read-state persists in BFF cookie scope only.

### Assessment

- Acceptable for preview.
- Real upstream path now behaves correctly after read-state fix.

## G. Preview/Production Safety Rules

The following rules should remain enforced:

1. Upstream mode must never silently fall back to mock writes.
2. Preview mode must always show preview wording in the UI.
3. `503 PREVIEW_MODE` is better than fake success.
4. Demo endpoints should stay isolated under BFF/preview paths.

## Task Extraction

### Codex

- Review bot editor write-path policy and keep detail preview visible while preview writes stay explicit read-only
- Verify Dashboard / Reports mode banners are consistent with actual backend behavior

### Cursor

- Unify preview/upstream wording across:
  - dashboard
  - reports
  - bots
  - leads
  - sites
  - notifications
- Ensure empty/loading/error/success states mention real mode truthfully

## Release Decision

Current status: acceptable for continued V1 hardening.

Blocking risk: lowered after bot preview write-path was converted to explicit read-only. Remaining work is mainly wording consistency and full-page regression.
