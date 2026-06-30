# Codex Working Guide

Read `AGENTS.md`, `docs/02-prd-mvp.md`, `docs/03-system-architecture.md`,
`docs/04-data-model.md`, `docs/05-api-contract.md`, and `docs/09-ai-development-rules.md`
before starting any backend task.

## Scope

- Codex only edits `apps/api/**`, `apps/worker/**`, `infra/**`, and database schema or migration files.
- Keep work scoped to the current Task ID from `TASKS.md`.
- Use `workspace_id` for multi-tenant isolation everywhere it matters.

## Workflow

1. Output an implementation plan and impacted files before coding.
2. Make the smallest change that satisfies the task.
3. Add or update tests for the important behavior.
4. Run lint, typecheck, and tests before handing off.
5. Update `TASKS.md` when the task is complete or blocked.

## Handoff Style

- Be explicit about files changed.
- Call out known limitations instead of hiding them.
- Keep the next task ready for Cursor or Codex with clear dependencies.
