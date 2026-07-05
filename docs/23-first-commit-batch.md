# First Commit Batch

Last updated: 2026-07-05

## Goal

Submit the safest first batch with:

- low runtime risk
- high reviewer value
- clear project coordination context

## Recommended First Batch

Suggested branch:

```text
feature/project-ops-docs
```

Suggested commit message:

```text
chore: align project docs, task board, and release runbooks
```

## Include These Files

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
- `docs/21-page-acceptance-runbook.md`
- `docs/22-next-hardening-board.md`
- `docs/23-first-commit-batch.md`
- `docs/24-acceptance-report-2026-07-05.md`

## Why This Goes First

1. No schema or runtime risk
2. Gives Cursor, Codex, and reviewers one shared operating model
3. Makes later backend and console commits much easier to review

## Reviewer Focus

Reviewers should check:

1. Task split is realistic
2. Preview/upstream boundaries are clearly described
3. Acceptance checklist matches the actual product
4. Commit ordering is safe and practical

## Exclude From First Batch

Do not mix these into the first docs commit:

- `apps/api/**`
- `apps/console/**`
- `apps/worker/**`
- `infra/**`
- `migration/**`

Those should land in later themed batches.
