# Console Submit Order

Last updated: 2026-07-05

## Goal

Break the current Console and shared UI work into reviewable batches with lower conflict risk.

## Recommended Branch

```text
feature/console-mvp-polish
```

## Recommended Commit Groups

### Console Batch 1: Auth Entry And Access Shell

Suggested commit message:

```text
feat(console): add auth entry flows, redirects, and access shells
```

Files:

- `apps/console/src/app/layout.tsx`
- `apps/console/src/app/page.tsx`
- `apps/console/src/app/login/**`
- `apps/console/src/app/register/**`
- `apps/console/src/app/reset-password/**`
- `apps/console/src/app/trial/**`
- `apps/console/src/app/accept-invite/**`
- `apps/console/src/app/legal/**`
- `apps/console/src/components/auth/**`
- `apps/console/src/lib/auth/**`
- `apps/console/src/server/auth-*`
- `apps/console/src/styles/login.module.css`

### Console Batch 2: Layout, Navigation, And Shared Console Scaffolding

Suggested commit message:

```text
feat(console): add dashboard shell, navigation, and shared console states
```

Files:

- `apps/console/src/app/dashboard/layout.tsx`
- `apps/console/src/components/layout/**`
- `apps/console/src/components/console/**`
- `apps/console/src/components/shared/**`
- `apps/console/src/components/brand/**`
- `apps/console/src/lib/navigation.ts`
- `apps/console/src/lib/console/**`
- `apps/console/src/lib/api/**`
- `apps/console/src/lib/workspace-events.ts`
- `apps/console/src/styles/console.css`
- `packages/ui/src/components/alert.tsx`
- `packages/ui/src/components/button.tsx`
- `packages/ui/src/components/confirm-dialog.tsx`
- `packages/ui/src/components/dropdown-menu.tsx`
- `packages/ui/src/components/empty-state.tsx`
- `packages/ui/src/components/page-header.tsx`
- `packages/ui/src/components/skeleton.tsx`
- `packages/ui/src/components/stat-card.tsx`
- `packages/ui/src/components/index.ts`
- `packages/ui/src/globals.css`
- `packages/ui/src/styles/theme.css`
- `packages/ui/src/styles/motion.css`
- `packages/ui/tailwind.preset.ts`

### Console Batch 3: Dashboard And Reports

Suggested commit message:

```text
feat(console): add dashboard and reports upstream-aware views
```

Files:

- `apps/console/src/app/dashboard/page.tsx`
- `apps/console/src/app/dashboard/reports/**`
- `apps/console/src/components/dashboard/**`
- `apps/console/src/components/reports/**`
- `apps/console/src/lib/dashboard/**`
- `apps/console/src/lib/reports/**`
- `apps/console/src/lib/analytics/**`
- `apps/console/src/styles/dashboard-overview.module.css`

### Console Batch 4: Knowledge Base

Suggested commit message:

```text
feat(console): add knowledge base upload, status, and delete flows
```

Files:

- `apps/console/src/app/dashboard/knowledge-bases/**`
- `apps/console/src/components/knowledge/**`
- `apps/console/src/lib/knowledge/**`

### Console Batch 5: Bots

Suggested commit message:

```text
feat(console): add bot management, preview, and install guidance
```

Files:

- `apps/console/src/app/dashboard/bots/**`
- `apps/console/src/components/bots/**`
- `apps/console/src/lib/bots/**`
- `apps/console/src/generated/**`
- related shared UI pieces already not committed elsewhere

Note:

- keep the current preview-readonly policy intact

### Console Batch 6: Conversations, Leads, And Notifications

Suggested commit message:

```text
feat(console): add conversations, leads, and notification workflows
```

Files:

- `apps/console/src/app/dashboard/conversations/**`
- `apps/console/src/app/dashboard/leads/**`
- `apps/console/src/components/conversations/**`
- `apps/console/src/components/leads/**`
- `apps/console/src/components/notifications/**`
- `apps/console/src/lib/conversations/**`
- `apps/console/src/lib/leads/**`
- `apps/console/src/lib/notifications/**`

### Console Batch 7: Sites, Team, Super Admin, System Status, Acceptance

Suggested commit message:

```text
feat(console): add sites, team management, super-admin, and system status
```

Files:

- `apps/console/src/app/dashboard/sites/**`
- `apps/console/src/app/dashboard/team/**`
- `apps/console/src/app/dashboard/invitations/**`
- `apps/console/src/app/dashboard/super-admin/**`
- `apps/console/src/app/dashboard/system-status/**`
- `apps/console/src/app/dashboard/acceptance/**`
- `apps/console/src/components/sites/**`
- `apps/console/src/components/team/**`
- `apps/console/src/components/platform/**`
- `apps/console/src/components/system/**`
- `apps/console/src/components/acceptance/**`
- `apps/console/src/lib/sites/**`
- `apps/console/src/lib/platform/**`
- `apps/console/src/lib/system-status/**`
- `apps/console/src/lib/acceptance/**`

### Console Batch 8: Tooling And E2E

Suggested commit message:

```text
chore(console): add eslint v9 config, e2e harness, and test scripts
```

Files:

- `apps/console/package.json`
- `apps/console/eslint.config.mjs`
- `apps/console/e2e/**`
- `apps/console/PAGE-ACCEPTANCE-CHECKLIST.md`

## Review Order

1. auth entry
2. shell + shared states
3. dashboard + reports
4. knowledge
5. bots
6. conversations + leads + notifications
7. sites + team + super-admin + system status
8. tooling + e2e

## Notes

1. Do not mix Console and `apps/api` runtime files in the same commit.
2. Keep preview/upstream wording changes with the related feature batch where possible.
3. If one batch grows too large, split by page group rather than by random file type.
