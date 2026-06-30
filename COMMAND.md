# Qiyun AI 项目指挥文档

这份文档是给你、Cursor 和 Codex 共同使用的协作说明。  
先看 `TASKS.md`，再按下面的分工和提示词执行。  
Cursor 的长期规则放在 `.cursor/rules/project.mdc`，Codex 的长期规则放在 `CODEX.md`。

## 角色分工

### Cursor

负责前端和视觉体验：

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

### Doing

- [ ] P-01 控制台基础布局
  - Owner: Cursor
  - Branch: feature/P-01-console-shell
  - Scope: apps/console/**, packages/ui/**
  - Depends on: A-05

### Review

- 暂无

### Done

- [x] A-00 仓库与文档包
- [x] A-01 项目初始化
- [x] A-02 工程骨架与模块目录
- [x] A-03 环境变量校验与 `.env.example`
- [x] A-04 ESLint、Prettier、Husky、CI 基础检查
- [x] A-05 设计系统与基础 UI

## 给 Cursor 的固定提示词

```text
阅读 docs/02-prd-mvp.md、docs/06-pages.md、docs/07-design-system.md 和 AGENTS.md。

你是本项目的前端与 UI 负责人。
只允许修改 apps/console 和 packages/ui 目录。

当前任务：P-01 控制台基础布局。

要求：
1. 使用现有 Design Token 和 shadcn/ui。
2. 必须有 loading、empty、error、success 状态。
3. 必须适配桌面和移动端。
4. 先完成登录页、侧边栏、顶栏和基础布局骨架。
5. 不修改数据库、后端 API、Docker 和鉴权逻辑。
6. 完成后列出修改文件，并运行 lint、typecheck。
```

## 给 Codex 的固定提示词

```text
阅读 AGENTS.md、docs/02-prd-mvp.md、docs/03-system-architecture.md、
docs/04-data-model.md、docs/05-api-contract.md、docs/09-ai-development-rules.md。

你是本项目的后端工程负责人。
只允许修改 apps/api、apps/worker、infra、数据库 schema 与 migration。

当前任务：下一个后端 Task ID 由 TASKS.md 指定。

要求：
1. 先输出实施计划和受影响文件。
2. 必须按 workspace_id 做多租户隔离。
3. 新任务开始前先明确 API 契约和数据流。
4. 完成后列出改动、测试结果和已知限制。
```

## 工作规则

- 每个任务只用一个独立分支。
- 不要长期在 `main` 上直接改。
- 分支与上传规范见 `docs/branch-workflow.md`。
- 先更新 `TASKS.md`，再动代码。
- 完成后先跑 lint 和 typecheck，再做合并。
- 发现阻塞时，先记录在看板里，不要自己吞掉。

## GitHub CLI

- 如果本机已登录 GitHub，可以直接使用 `gh` 管理 Issue、PR 和 Project。
- 仓库名建议统一使用 `qiyun-ai`。
- 项目中文名建议统一使用 `Qiyun AI Enterprise Platform / 企云 AI 企业智能服务平台`。

## GitHub Project / Issues

- 工作流说明：`docs/github-project-workflow.md`
- Issue 表单：`.github/ISSUE_TEMPLATE/task.yml`、`.github/ISSUE_TEMPLATE/bug_report.yml`
- PR 模板：`.github/PULL_REQUEST_TEMPLATE.md`
- 标签定义：`.github/labels.yml`
- 创建 GitHub Project：`powershell -ExecutionPolicy Bypass -File scripts/create-gh-project.ps1`
- 同步标签：`powershell -ExecutionPolicy Bypass -File scripts/create-gh-labels.ps1`
- 创建第一批任务 Issue：`powershell -ExecutionPolicy Bypass -File scripts/create-gh-seed-issues.ps1`
