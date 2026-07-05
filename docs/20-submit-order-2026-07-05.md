# Submit Order 2026-07-05

## Goal

Turn the current large worktree into mergeable batches with minimal cross-file conflict risk.

## Recommended Branch Strategy

1. `feature/project-ops-docs`
2. `feature/backend-platform-hardening`
3. `feature/console-mvp-polish`
4. `feature/infra-release-hardening`

If one branch is preferred, still commit in the batch order below.

## Batch 1: Project Docs And Coordination

Suggested commit message:

```text
chore: align project docs, task board, and release checklists
```

Files:

- `.cursor/rules/project.mdc`
- `AGENTS.md`
- `COMMAND.md`
- `TASKS.md`
- `docs/12-console-backend-gaps.md`
- `docs/14-automated-test-plan.md`
- `docs/15-release-acceptance-checklist.md`
- `docs/16-commit-plan.md`
- `docs/17-p0-collaboration-briefs.md`
- `docs/18-demo-runbook.md`
- `docs/19-console-upstream-audit.md`
- `docs/20-submit-order-2026-07-05.md`

Why first:

- zero runtime risk
- gives reviewers context for everything that follows

## Batch 2: Auth / Workspace / Platform Admin

Suggested commit message:

```text
feat(api): finalize auth, workspace boundaries, and platform admin flows
```

Files:

- `apps/api/src/auth/**`
- `apps/api/src/security/**`
- `apps/api/src/workspace.ts`
- `apps/api/src/config/env.ts`
- `apps/api/src/nest/auth/**`
- `migration/002_auth_workspace.sql`
- `migration/003_workspace_invitations.sql`
- `migration/004_runtime_state.sql`
- `migration/008_email_login_codes.sql`
- `migration/009_email_login_code_purpose.sql`
- `migration/010_platform_provisioning.sql`
- `migration/016_fix_corrupted_user_names.sql`
- `migration/017_trial_requests.sql`

## Batch 3: Core Persistence And Domain Repositories

Suggested commit message:

```text
feat(api): add postgres-backed persistence for chat, documents, and rag
```

Files:

- `apps/api/src/db/**`
- `apps/api/src/runtime.ts`
- `apps/api/src/runtime.test.ts`
- `apps/api/src/chat/**`
- `apps/api/src/documents/**`
- `apps/api/src/rag/**`
- `migration/001_init_qiyun_api.sql`
- `migration/005_bot_settings.sql`
- `migration/006_site_key_hash_and_bot_llm.sql`
- `migration/007_site_key_productionization.sql`
- `migration/011_bot_recommended_questions.sql`
- `migration/012_lead_attachments.sql`
- `migration/013_document_error_code.sql`
- `migration/014_notification_reads.sql`
- `migration/015_lead_follow_up_records.sql`
- `migration/018_conversation_ai_meta.sql`
- `migration/019_lead_prompt_cooldown.sql`

## Batch 4: Queue / Worker / Storage / Embedding / Vector

Suggested commit message:

```text
feat(worker): add document processing, storage, and retrieval infrastructure
```

Files:

- `apps/api/src/queue/**`
- `apps/api/src/integration/**`
- `apps/api/src/llm/**`
- `apps/worker/src/main.ts`
- `apps/worker/src/main.test.ts`
- `apps/worker/package.json`
- `apps/worker/tsconfig.json`
- `apps/worker/eslint.config.cjs`
- `apps/api/assets/**`

## Batch 5: HTTP / Nest / Health / Tests

Suggested commit message:

```text
feat(api): stabilize routing, health checks, and automated api coverage
```

Files:

- `apps/api/src/app.ts`
- `apps/api/src/app.test.ts`
- `apps/api/src/main.ts`
- `apps/api/src/http/**`
- `apps/api/src/health/**`
- `apps/api/src/nest/**`
- `apps/api/src/load-env.ts`
- `apps/api/package.json`
- `apps/api/eslint.config.cjs`
- `apps/api/tsconfig.json`

## Batch 6: Console Product UI

Suggested commit message:

```text
feat(console): deliver mvp console flows with upstream and preview states
```

Files:

- `apps/console/**`
- `packages/ui/**`

Recommended split if this batch is too large:

1. auth + super-admin + legal
2. dashboard + reports
3. knowledge + bots
4. conversations + leads + notifications
5. sites + team + system-status

## Batch 7: Widget

Suggested commit message:

```text
feat(widget): add embeddable widget runtime and demo assets
```

Files:

- `apps/widget/**`

## Batch 8: Infra / Scripts / Release Tooling

Suggested commit message:

```text
chore(infra): finalize docker, ecs, env examples, and acceptance scripts
```

Files:

- `infra/**`
- `scripts/**`
- `.env.example`
- `.gitignore`
- `.npmrc`
- `package.json`
- `pnpm-lock.yaml`
- `pnpm-workspace.yaml`
- `turbo.json`
- `packages/config/src/index.ts`

## Suggested Review Order

1. docs
2. auth/platform
3. persistence/domain
4. worker/integration
5. api/http/tests
6. console
7. widget
8. infra/scripts

## Merge Gate

Each batch should satisfy all of the following before merge:

1. Scope is single-theme and explainable
2. Relevant tests were run
3. No local secrets are included
4. No temporary debug logs are included
5. No preview behavior is misrepresented as real persistence
