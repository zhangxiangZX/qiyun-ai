# Branch Workflow

This project uses one branch per task. Cursor and Codex should never upload to the same feature branch at the same time.

## Rules

- `main` is only for reviewed and merged work.
- Each task gets one branch.
- Cursor branches only change `apps/console/**` and `packages/ui/**`.
- Codex branches only change `apps/api/**`, `apps/worker/**`, `infra/**`, `migration/**`, and backend-related docs.
- If one feature needs frontend and backend work, split it into two tasks and two branches.
- Push branches to GitHub and merge through Pull Requests.

## Codex Backend Branch

Use this flow for backend tasks:

```powershell
Set-Location E:\qiyun-ai

git checkout main
git pull

git checkout -b feature/C-02-upload

# Codex changes backend files only.

git status
git add .
git commit -m "add knowledge upload backend"
git push -u origin feature/C-02-upload
```

Allowed scope example:

```text
apps/api/**
apps/worker/**
infra/**
migration/**
docs/05-api-contract.md
```

## Cursor Frontend Branch

Use this flow for frontend tasks:

```powershell
Set-Location E:\qiyun-ai

git checkout main
git pull

git checkout -b feature/P-04-knowledge-ui

# Cursor changes frontend files only.

git status
git add .
git commit -m "add knowledge upload UI"
git push -u origin feature/P-04-knowledge-ui
```

Allowed scope example:

```text
apps/console/**
packages/ui/**
docs/06-pages.md
docs/07-design-system.md
```

## Split Task Example

For knowledge upload, split the work like this:

| Task | Owner | Branch | Scope |
| --- | --- | --- | --- |
| C-02 文件上传与文档状态机 | Codex | `feature/C-02-upload` | `apps/api/**`, `apps/worker/**`, `migration/**` |
| P-04 知识库上传页面 | Cursor | `feature/P-04-knowledge-ui` | `apps/console/**`, `packages/ui/**` |

## Before Push

Run the checks for the area you changed.

Frontend:

```powershell
pnpm --filter qiyun-console lint
pnpm --filter qiyun-console typecheck
pnpm --filter @qiyun/ui typecheck
```

Backend:

```powershell
pnpm --filter qiyun-api lint
pnpm --filter qiyun-api typecheck
pnpm --filter qiyun-api test
```

## Pull Request

Every PR should include:

- linked issue
- changed files summary
- test results
- known limitations
- screenshots for UI changes
- API examples for backend changes
