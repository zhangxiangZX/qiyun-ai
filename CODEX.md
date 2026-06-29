# CODEX.md

This repository is organized for task-based collaboration for Qiyun AI / 企云 AI.

## Workflow
- Read `AGENTS.md` and the task-specific docs before editing.
- Work on one Task ID per branch.
- Prefer small, reviewable changes.
- Keep backend, database, worker, deployment, and migration changes in Codex scope.
- Keep UI and visual work in Cursor scope.

## Branching
- Create a feature branch for each task.
- Do not keep making long-lived edits directly on `main`.
- Use descriptive branch names, for example `feature/D-03-rag-retrieval`.

## Verification
- Run the checks required by the task.
- Update the task board when a task is complete.
