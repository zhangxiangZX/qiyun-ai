# Qiyun AI 项目指挥文档

这份文档给你、Cursor 和 Codex 共用。  
先看 `TASKS.md`，再按下面的分工、范围和固定提示词执行。

Cursor 的项目级规则放在 `.cursor/rules/project.mdc`。  
Codex 的项目级规则放在 `CODEX.md`。

## 角色分工

### Cursor

负责前端和 UI：

- UI 页面
- Design System
- shadcn/ui 组件
- 响应式布局
- 前端表单和状态管理
- 前端 API 接入
- 页面视觉 Review

### Codex

负责后端和工程化能力：

- 数据库与 migration
- NestJS API
- 鉴权与权限
- 文件上传和知识库解析
- Qdrant / Redis / 队列
- SSE 聊天流
- Docker、部署、测试
- 代码审查与 Bug 修复

## 当前看板

以 `TASKS.md` 为唯一准入看板。

### Review

- P-02 Dashboard：`feature/P-02-dashboard`
- P-04 知识库上传：`feature/P-04-knowledge-ui`
- P-03 机器人列表：`feature/P-03-bots-ui`
- P-05 会话页面：`feature/P-05-conversations-ui`
- P-06 线索页面：`feature/P-06-leads-ui`
- P-07 站点与嵌入：`feature/P-07-sites-ui`

### Doing（Codex）

- C-02 文件上传与文档状态机：`feature/C-02-upload`

任何新任务开始前，先补任务卡，再开分支。

## 给 Cursor 的固定提示词

```text
阅读 docs/02-prd-mvp.md、docs/06-pages.md、docs/07-design-system.md 和 AGENTS.md。

你是本项目的前端与 UI 负责人。
只允许修改 apps/console 和 packages/ui 目录。

当前任务以 TASKS.md 为准。

要求：
1. 使用现有 Design Token 和 shadcn/ui。
2. 必须有 loading、empty、error、success 状态。
3. 必须适配桌面和移动端。
4. 不修改数据库、后端 API、Docker 和鉴权逻辑。
5. 完成后列出修改文件，并运行 lint、typecheck。
```

## 给 Codex 的固定提示词

```text
阅读 AGENTS.md、docs/02-prd-mvp.md、docs/03-system-architecture.md、
docs/04-data-model.md、docs/05-api-contract.md、docs/09-ai-development-rules.md。

你是本项目的后端工程负责人。
只允许修改 apps/api、apps/worker、infra、数据库 schema 与 migration。

当前任务以 TASKS.md 为准。

要求：
1. 先输出实施计划和受影响文件。
2. 必须按 workspace_id 做多租户隔离。
3. 新任务开始前先明确 API 契约和数据流。
4. 完成后列出改动、测试结果和已知限制。
```

## 工作规则

- 每个任务只用一个独立分支。
- 不要长期在 `main` 上直接修改。
- 分支与上传规范见 `docs/branch-workflow.md`。
- 先更新 `TASKS.md`，再动代码。
- 完成后先跑 lint 和 typecheck，再准备合并。
- 发现阻塞时，先记录在看板里，不要默默跳过。

## GitHub CLI

- 如果本机已登录 GitHub，可以直接用 `gh` 管理 Issue、PR 和 Project。
- 仓库名统一使用 `qiyun-ai`。
- 项目中文名统一使用 `Qiyun AI Enterprise Platform / 企云 AI 企业智能服务平台`。

## GitHub Project / Issues

- 工作流说明：`docs/github-project-workflow.md`
- Issue 表单：`.github/ISSUE_TEMPLATE/task.yml`、`.github/ISSUE_TEMPLATE/bug_report.yml`
- PR 模板：`.github/PULL_REQUEST_TEMPLATE.md`
- 标签定义：`.github/labels.yml`
- 创建 GitHub Project：`powershell -ExecutionPolicy Bypass -File scripts/create-gh-project.ps1`
- 同步标签：`powershell -ExecutionPolicy Bypass -File scripts/create-gh-labels.ps1`
- 创建第一批任务 Issue：`powershell -ExecutionPolicy Bypass -File scripts/create-gh-seed-issues.ps1`
