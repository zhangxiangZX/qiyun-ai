# Qiyun AI Commit Plan

> 目标：把当前大批量改动拆成可审查、可回滚、可分工合并的提交序列。

## 1. 当前建议

当前工作区同时混有：

- 后端能力建设
- 部署与脚本
- 控制台 UI 收边
- 项目规则与指挥文档

不建议一次性提交全部改动。更稳妥的做法是按下面顺序拆分。

## 2. 推荐提交顺序

### Commit 1: Project rules and coordination docs

建议提交信息：

```text
chore: align project rules, command docs, and task board
```

建议文件范围：

- `.cursor/rules/project.mdc`
- `COMMAND.md`
- `TASKS.md`
- `docs/12-console-backend-gaps.md`
- `docs/14-automated-test-plan.md`
- `docs/15-release-acceptance-checklist.md`
- `docs/16-commit-plan.md`

### Commit 2: Workspace and auth foundation

建议提交信息：

```text
feat(api): add workspace auth boundaries and runtime env foundation
```

建议文件范围：

- `apps/api/src/config/env.ts`
- `apps/api/src/auth/**`
- `apps/api/src/security/**`
- `apps/api/src/workspace.ts`
- `migration/002_auth_workspace.sql`
- `migration/003_workspace_invitations.sql`
- `migration/004_runtime_state.sql`
- `apps/api/src/nest/auth/**`

### Commit 3: Persistent storage and repositories

建议提交信息：

```text
feat(api): add postgres persistence for documents, chat, and rag data
```

建议文件范围：

- `apps/api/src/db/**`
- `apps/api/src/documents/**`
- `apps/api/src/chat/**`
- `apps/api/src/rag/**`
- `apps/api/src/runtime.ts`
- `apps/api/src/runtime.test.ts`
- `migration/001_init_qiyun_api.sql`
- `migration/005_bot_settings.sql`
- `migration/006_site_key_hash_and_bot_llm.sql`
- `migration/007_site_key_productionization.sql`

### Commit 4: Queue, worker, object storage, and vector infrastructure

建议提交信息：

```text
feat(worker): add queue, minio, redis, and qdrant integration
```

建议文件范围：

- `apps/api/src/queue/**`
- `apps/api/src/integration/**`
- `apps/api/src/llm/**`
- `apps/worker/src/main.ts`
- `apps/worker/package.json`
- `apps/api/assets/**`
- `apps/api/.data/**`
- `.data/**`

### Commit 5: HTTP entry, Nest routing, health, and test stabilization

建议提交信息：

```text
feat(api): modularize http routing, health checks, and streaming flow
```

建议文件范围：

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

### Commit 6: Console UI and shared UI package

建议提交信息：

```text
feat(console): deliver console mvp polish and upstream integration states
```

建议文件范围：

- `apps/console/**`
- `packages/ui/**`

说明：

- 这一提交体量会比较大，但建议不要再混入后端文件
- 如果还想更细，可以再拆成 `dashboard / knowledge / bots / conversations / leads / sites / team`

### Commit 7: Infra, deployment, and developer tooling

建议提交信息：

```text
chore(infra): finalize docker, ecs, test scripts, and env examples
```

建议文件范围：

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

## 3. 更稳的分支策略

如果你准备把后端和前端分别合并，建议这样做：

### 分支 A: 后端与基础设施

- `feature/backend-platform-hardening`

范围：

- `apps/api`
- `apps/worker`
- `migration`
- `infra`
- `scripts`

### 分支 B: 控制台前端

- `feature/console-mvp-polish`

范围：

- `apps/console`
- `packages/ui`

### 分支 C: 文档与指挥文件

- `feature/project-ops-docs`

范围：

- `docs`
- `TASKS.md`
- `COMMAND.md`
- `.cursor/rules/project.mdc`

## 4. 合并前检查

每个提交都建议满足：

- 只覆盖一个清晰主题
- 能单独解释改动目的
- 自动化至少跑过相关测试
- 不混入临时代码或无关格式化

## 5. 推荐实际提交节奏

1. 先提交文档和指挥文件
2. 再提交后端基础能力
3. 再提交 RAG / 队列 / SSE / 存储
4. 再提交 Docker / 部署 / 测试脚本
5. 最后提交控制台 UI

## 6. 可直接照抄的提交文案

```text
chore: align project rules, docs, and release checklist
feat(api): add workspace auth boundaries and postgres repositories
feat(api): add queue, rag retrieval, and sse chat flow
chore(infra): finalize docker deployment and automated test scripts
feat(console): polish dashboard, knowledge, bots, conversations, and sites
```
