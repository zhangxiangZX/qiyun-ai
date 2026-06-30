# GitHub Project Workflow

This workflow keeps GitHub Issues, Cursor work, Codex work, and Pull Requests aligned.

## Project

Recommended Project name:

`Qiyun AI Enterprise Platform`

Recommended repository:

`zhangxiangZX/qiyun-ai`

## Project Fields

Create these fields in GitHub Project:

| Field | Type | Values |
| --- | --- | --- |
| Status | Single select | Inbox, Ready, In Progress, Review, Blocked, Done |
| Owner | Single select | You, Cursor, Codex |
| Area | Single select | Console, API, Worker, Widget, Infra, Docs |
| Priority | Single select | P0, P1, P2 |
| Branch | Text | `feature/<TaskID>-<short-name>` |
| Scope | Text | Allowed directories or files |
| Depends on | Text | Blocking Task IDs or PRs |
| Milestone | Single select | MVP, Hardening, Launch |

## Status Rules

Use `Inbox` for raw ideas that have not been scoped.

Use `Ready` when the issue has:

- Task ID
- owner
- branch
- allowed scope
- acceptance criteria
- test plan

Use `In Progress` only after a branch exists.

Use `Review` when a PR exists and verification results are included.

Use `Blocked` when the task cannot continue without another issue, PR, API contract, design, or decision.

Use `Done` only after the PR is merged and any follow-up docs are updated.

## Labels

Use these labels:

- `cursor`: frontend/UI owner
- `codex`: backend/engineering owner
- `area:console`, `area:api`, `area:worker`, `area:widget`, `area:infra`
- `priority:p0`, `priority:p1`, `priority:p2`
- `blocked`, `review`, `needs-triage`

The source of truth for label definitions is `.github/labels.yml`.

## Issue Naming

Use this format:

```text
[Task] C-02 文件上传与文档状态机
[Task] P-04 知识库上传页面
[Bug] Widget stream reconnect fails after refresh
```

## Branch Naming

Use this format:

```text
feature/C-02-upload
feature/P-04-knowledge-ui
fix/D-06-stream-reconnect
```

## Pull Request Rules

Every PR must include:

- linked issue
- scope check
- acceptance criteria
- lint/typecheck/test results
- known limitations
- screenshots for UI work
- API examples for backend work

## Daily PM Review

Codex can run this review once per day:

```text
Read GitHub Issues and Pull Requests for zhangxiangZX/qiyun-ai.

Act as the project manager for Qiyun AI.
Check:
1. Which tasks are blocked and why.
2. Which PRs have no test result.
3. Which issues have no owner, scope, branch, or acceptance criteria.
4. Whether Cursor and Codex are editing overlapping paths.
5. Which Ready tasks should start next.

Do not modify code.
Output:
- Blocked
- Needs Triage
- PR Review Needed
- Scope Conflicts
- Recommended Next Tasks
```

## Useful GitHub CLI Commands

Check authentication:

```powershell
.\scripts\gh.ps1 auth status
```

Create or reuse the GitHub Project and fields:

```powershell
.\scripts\create-gh-project.ps1
```

Sync labels:

```powershell
.\scripts\create-gh-labels.ps1
```

Create the first batch of task issues:

```powershell
.\scripts\create-gh-seed-issues.ps1
```

Create a single task issue manually:

```powershell
.\scripts\gh.ps1 issue create --repo zhangxiangZX/qiyun-ai --title "[Task] C-02 文件上传与文档状态机" --label "task,codex,area:api,priority:p1"
```

List open tasks:

```powershell
.\scripts\gh.ps1 issue list --repo zhangxiangZX/qiyun-ai --label task --state open
```

List PRs waiting for review:

```powershell
.\scripts\gh.ps1 pr list --repo zhangxiangZX/qiyun-ai --state open
```

Create a PR:

```powershell
.\scripts\gh.ps1 pr create --repo zhangxiangZX/qiyun-ai --base main --head feature/C-02-upload --title "[C-02] 文件上传与文档状态机" --fill
```

## First Batch Issues

Create these first:

| Task ID | Owner | Area | Branch | Priority |
| --- | --- | --- | --- | --- |
| P-01 | Cursor | Console | `feature/P-01-console-shell` | P1 |
| B-01 | Codex | API | `feature/B-01-auth` | P1 |
| B-02 | Codex | API | `feature/B-02-workspace-switch` | P1 |
| C-01 | Codex | API | `feature/C-01-knowledge-crud` | P1 |
| C-09 | Cursor | Console | `feature/C-09-knowledge-ui` | P1 |

Keep only one Cursor task and one Codex task in progress at the same time until the API contract is stable.
