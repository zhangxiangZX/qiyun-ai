# COMMAND.md

这是给你、Cursor、Codex 直接使用的 Qiyun AI / 企云 AI 项目指挥文档。

先看 `TASKS.md` 领取任务，再按这里的分工和提示词执行。

## 当前任务看板

### Doing

- [ ] A-04 ESLint、Prettier、Husky、CI 基础检查
  - Owner: Codex
  - Branch: feature/A-04-code-quality
  - Scope: package.json, .eslintrc.cjs, .prettierrc.json, .husky/**, .github/workflows/**
  - Goal: 统一代码规范、提交钩子与 CI 基础校验

### Ready for Cursor

- [ ] P-01 控制台基础布局
  - Owner: Cursor
  - Branch: feature/P-01-console-shell
  - Scope: apps/console/**, packages/ui/**
  - Depends on: A-02

### Review

- 暂无

### Done

- [x] A-00 仓库与文档包
- [x] A-01 项目初始化
- [x] A-02 工程骨架与模块目录
- [x] A-03 环境变量校验与 `.env.example`

## 角色分工

### Cursor 负责
- UI 页面
- Design System
- shadcn/ui 组件
- 响应式布局
- 前端表单和状态管理
- 前端 API 接入
- 页面视觉 Review

### Codex 负责
- 数据库与 migration
- NestJS API
- 鉴权与权限
- 文件上传与知识库解析
- Qdrant / Redis / 队列
- SSE 聊天流
- Docker、部署、测试
- 代码审查与 Bug 修复

## 分支规则

- 每个任务只用一个独立分支。
- 不要长期在 `main` 上直接改。
- 分支命名建议：`feature/<TaskID>-<short-name>`。
- 任务完成后再合并，不要把多个任务混在一个分支里。

示例：

```bash
git checkout -b feature/C-02-upload
git checkout -b feature/P-04-knowledge-ui
git checkout -b feature/D-03-rag-retrieval
```

## GitHub CLI

- 这个仓库自带 `scripts/gh.ps1`，可以在 PowerShell 里直接转发到本机安装的 `gh`。
- 如果当前 shell 还没刷新 PATH，可以先用：

```powershell
.\scripts\gh.ps1 --version
.\scripts\gh.ps1 auth status
```

- 如果还没有登录，请运行：

```powershell
.\scripts\gh.ps1 auth login --web --git-protocol https
```

- 登录成功后，就可以用它管理 repo、Issues、PR、Project。

## 任务流

1. 从 `TASKS.md` 领取一个明确的 Task ID。
2. 建立对应分支。
3. 先读任务相关 docs。
4. 只改任务范围内的文件。
5. 完成后运行必要检查。
6. 更新 `TASKS.md` 状态。
7. 输出改动说明、测试结果和已知限制。

## 本地工程模块名称

下面这些目录是项目的标准模块名，后续开发都以它们为准：

- `apps/console`：管理后台
- `apps/api`：后端 API
- `apps/widget`：官网 AI 客服挂件
- `apps/worker`：文档解析与向量化任务
- `packages/ui`：通用 UI 组件与 Design Token
- `packages/config`：共享配置、Lint、TS Config
- `infra`：Docker、部署、环境样例
- `migration`：数据库迁移与初始化脚本

## 直接发给 Cursor 的提示词

Cursor 也可以直接读取 `.cursor/commands/p01-console-shell.md`。

```text
阅读 docs/02-prd-mvp.md、docs/06-pages.md、docs/07-design-system.md 和 AGENTS.md。

你是本项目的前端与 UI 负责人。
只允许修改 apps/console 和 packages/ui 目录。

当前任务：P-01 控制台基础布局。

要求：
1. 使用现有 Design Token 和 shadcn/ui。
2. 必须有 loading、empty、error、success 状态。
3. 必须适配桌面和移动端。
4. 先完成登录页、侧边栏、顶栏和主内容区。
5. 不修改数据库、后端 API、Docker 和鉴权逻辑。
6. 完成后列出修改文件，并运行 lint、typecheck。
```

## 直接发给 Codex 的提示词

```text
阅读 AGENTS.md、docs/02-prd-mvp.md、docs/03-system-architecture.md、
docs/04-data-model.md、docs/05-api-contract.md、docs/09-ai-development-rules.md。

你是本项目的后端工程负责人。
只允许修改 apps/api、apps/worker、infra、数据库 schema 与 migration。

当前阶段：工程骨架已完成，等待下一项 Codex 任务。

要求：
1. 继续按 TASKS.md 领取后续任务。
2. 每次只改自己职责范围内的文件。
3. 新任务开始前先输出实施计划和受影响文件。
4. 完成后列出改动、测试结果和已知限制。
```

## Review 交接模板

### Codex Review Cursor

```text
审查当前前端变更。

按照 docs/07-design-system.md 和 docs/09-ai-development-rules.md 审查：
1. 是否存在硬编码样式。
2. 是否有 loading、error、empty、success 状态。
3. 是否存在权限或上传安全风险。
4. API 调用是否符合 docs/05-api-contract.md。
5. 是否适配移动端。

不要修改代码。
按 P0 / P1 / P2 输出问题和对应文件行号。
```

### Cursor 修复 Review

```text
根据以下 Code Review 修复 P0 和 P1 问题。
不要重构无关代码；完成后重新运行 lint 和 typecheck。
```

## 交接规则

- Cursor 做 UI，Codex 做后端。
- Cursor 不改数据库结构，只能提出建议。
- Codex 不自由发挥 UI，视觉由 Cursor 统一。
- 前后端联调时，先对齐 API 契约，再分别实现。
- 任何 Review 必须写出 P0 / P1 / P2 问题和对应文件位置。

## 建议节奏

- 第 1 天：Codex 做基础设施和后端骨架，Cursor 做控制台骨架和设计 token。
- 第 2 天：Codex 做知识库与文件流转，Cursor 做知识库页面。
- 第 3 天：Codex 做 RAG 和 SSE，Cursor 做机器人编辑页和预览。
- 第 4 天：Codex 做会话、线索和统计，Cursor 做数据看板。
- 第 5 天：双方互相 Review，修复问题，跑完整验收。

## 禁止事项

- 不要一句话让两个工具把整个项目做完。
- 不要让 Cursor 定数据库结构。
- 不要让 Codex 自由发挥 UI。
- 不要不经过 Git 直接覆盖。
- 不要把多个任务塞进一个分支。

## 第一轮推荐分工

- Cursor：P-01 控制台基础布局
- Codex：A-04 代码规范与 CI 基础检查
