# Qiyun AI 指挥文件

这份文件给你、Cursor、Codex 共用。
先看 `TASKS.md`，再按下面的分工、剩余功能和执行规则推进。

## 角色分工

### Cursor

只负责前端与 UI：

- `apps/console`
- `packages/ui`

职责范围：

- 后台页面
- Design System
- 响应式
- 前端表单与状态管理
- 前端 API 接入（BFF 代理层）
- 页面体验与视觉一致性
- `real api mode / preview mode` 表达清晰

### Codex

只负责后端与工程化：

- `apps/api`
- `apps/worker`
- `migration`
- `infra`

职责范围：

- 数据库与 migration
- API / SSE / RAG / 队列
- 文件上传与解析
- PostgreSQL / Qdrant / Redis 接入
- 测试、审查、Bug 修复

## 当前状态（2026-07-01）

### 已完成主线

- C-01 知识库 CRUD 基础合同
- C-02 文档上传与状态机基础链路
- D-03 RAG 检索服务合同
- D-04 Public Chat Stream 基础合同
- D-05 HTTP Chat / Leads / Conversations 路由层
- D-06 Chat PostgreSQL persistence scaffold
- D-07 Chat repository runtime 支持 `memory / postgres`
- **F-06 控制台模式治理**（Preview / 真实 API 横幅、BFF 代理、演示数据警告）
- **P-04 知识库后台 BFF 接入**
- **概览 / 报表页模式提示**
- **B-01 ~ B-16** … NestJS 全量模块化 + Express HTTP 入口（`main.ts` → `NestFactory.create`）
- **TUI-01 ~ TUI-15** 控制台 UI 第二轮收边（团队、邀请、导航、知识库、各业务页、空态/错误/成功反馈体系）
- **TUI-16** 前后端真实联调验收（工作区切换重载、会话筛选优化、后端 gap 文档 `docs/12-console-backend-gaps.md`）
- `main` 已合并 `feature/D-03-rag-retrieval`（`qiyun-ai-c02` 本地）

### 各页面数据模式（当前）

| 页面 | Preview（未配 `API_BASE_URL`） | Upstream（已配上游） |
|------|-------------------------------|----------------------|
| 知识库 | 本地演示数据 + 模式横幅 | BFF 代理 CRUD + multipart 上传 |
| 会话 | 演示数据；元数据不可保存 | 读上游会话；状态/标签 PATCH 可保存 |
| 聊天预览 | 本地模拟 SSE | 正式 SSE 事件流；已支持 OpenAI-compatible token streaming |
| 线索 | 演示数据 + 本地 PATCH | BFF 已接 `GET/PATCH /leads`；Upstream 可保存，`GET /leads/:id` 已支持 |
| 站点 | 演示数据；域名可本地保存 | 可读站点 + rotate-key + 域名 PATCH |
| 概览 / 报表 | 演示 KPI + 模式横幅 | `GET /dashboard`、`GET /reports` |
| 机器人 | Preview：内存创建/保存 | BFF 已接 `GET/POST/PATCH /bots`（依赖上游实现） |
| 团队 / 邀请 | 需登录 Session | BFF 代理 auth / members / invitations |

### 必须遵守

- 未配置 `API_BASE_URL` / `NEXT_PUBLIC_API_BASE_URL` 时，**不得**伪装成「真实后端已联调完成」
- Preview 模式下禁止伪持久化（会话元数据、站点密钥轮换写入上游等）
- 控制台 BFF **只做代理**，不在前端项目复制后端业务逻辑
- 前端 `*_API_AVAILABLE` 开关表示 BFF 已就绪，**不等于**上游业务已完整实现

## 剩余功能

### 交给 Cursor（第三轮，见 `TASKS.md` Ready for Cursor）

- [x] **TUI-16** 前后端真实联调验收
- [x] **TUI-17** Leads / Sites 接口预留适配
- [x] **TUI-18** 控制台发布前体验总收边
- [x] **TUI-19** 后端依赖问题清单整理（`docs/12-console-backend-gaps.md`）
- [x] **TUI-20** 演示脚本模式检查（Preview 演示引导）
- [x] **TUI-21** 全局文案与空态复检
- [x] **TUI-22** 移动端最终验收（safe-area / 触控区）
- [x] **TUI-23** Upstream 适配补强（线索写入、BFF 兜底、Bot 扩展字段只读）

### 交给 Cursor（历史项，已完成）

#### P-03 Bots

- [x] 数据适配层、BFF 代理、模式横幅、Preview 诚实保存
- [x] BFF `GET/POST/PATCH /bots` 路由；`BOTS_API_AVAILABLE = true`

#### TUI-04 知识库真实上传联调 + 引用展示收边

- [x] 上传区接入真实 multipart 上传
- [x] 明确展示 uploading / parsing / indexing / ready / failed
- [x] 聊天预览和会话详情统一 citation 卡片
- [x] Preview / Upstream 模式文案保持诚实

#### CUI 收口（Cursor，已完成）

- [x] CUI-01 ~ CUI-06（见 `TASKS.md` Done）

#### 全局收尾

- [ ] 将 `qiyun-ai` 工作区未提交的控制台改动合并提交
- [ ] 与 `qiyun-ai-c02` 的 `main` 对齐（或择一为主仓库）
- [ ] `git push origin main`（需先修复 GitHub SSH）

### 交给 Codex

> **主清单：** [`docs/12-console-backend-gaps.md`](docs/12-console-backend-gaps.md)（P0 → P1 → P2，含验收与 E2E 脚本）

#### P0（阻塞 Upstream 联调，优先）

- [x] BFF 数据路由 JWT 透传 — `upstream-request.ts`（2026-06-30）
- [x] `GET /bots/:id` + Bot 扩展字段持久化
- [x] `PATCH /sites/:id`（域名白名单）
- [x] `GET /leads/:id`（列表/PATCH 已有；供 Cursor 打开写入开关）
- [x] Sites / 聊天 PostgreSQL 真持久化

#### API / Persistence

- [x] `sites` PostgreSQL 持久化（见 P0-6）
- [x] chat persistence transaction helper
- [x] 真实 SQL client 接入 `PostgresChatRepository`
- [x] runtime 从环境变量切换 `memory / postgres`
- [x] `GET /leads` 列表、`PATCH /leads/:id`、`GET /leads/:id`
- [x] Sites `PATCH` 域名白名单
- [x] 会话元数据 PATCH（状态 / 标签）

#### Analytics

- [x] `GET /dashboard` 概览聚合接口
- [x] `GET /reports` 报表聚合接口
- [x] Console BFF 已接 dashboard / reports upstream 代理

#### Retrieval / Streaming

- [x] 真实 LLM token streaming
- [x] 将当前规则式回复切换为真实模型生成 token 流
- [x] Qdrant adapter 接线完成，保留 memory fallback
- [x] embedding provider 抽象完成，支持 openai-compatible 接入
- [x] Redis / inline 双队列驱动与 worker 消费闭环完成
- [x] Redis worker 失败重试、并发消费、死信队列完成
- [x] SSE 事件流协议完成，已串联 retrieval / token / citations / done
- [x] 文档原件存储支持 `local / minio` 驱动切换，默认后端联调走 MinIO
- [x] PostgresDocumentRepository 落地，知识库 / 文档状态机切到运行时 SQL 仓储
- [x] PostgresRagRepository 落地，bots / document_chunks 切到运行时 SQL 仓储
- [x] Qdrant 启动对账完成：启动时按数据库 chunks 对齐索引并清理陈旧 points
- [x] `/health` 升级为依赖健康检查：包含 PostgreSQL / Redis / Vector Store 状态

#### Framework / Infra

- [ ] 正式 NestJS controller / guard / auth
- [x] 工作区 header 切换权限校验（`x-workspace-id` 必须可访问）
- [x] rate limit
- [x] site key hash / rotate key 正式实现
- [x] Docker / 部署 / 环境联调收尾（文档与示例环境变量已补齐）

## Cursor 执行规则

1. 只改 `apps/console` 和 `packages/ui`
2. 不改 `apps/api`、`apps/worker`、`migration`、`infra`
3. 不复制更多后端逻辑到前端项目
4. 未配置真实后端时，页面必须诚实展示 preview/mock 状态
5. 完成后必须给出：修改文件列表、各页模式表、`lint / typecheck / build` 结果

## Codex 执行规则

### API Runtime 切换（P1-2）

| 场景 | `API_RUNTIME_DRIVER` | 说明 |
|------|---------------------|------|
| 单元测试 / 快速本地 | `memory` | 默认；数据在进程内存，重启丢失 |
| 联调 / 演示 / 生产 | `postgres` | 需 `DATABASE_URL` + `pnpm --filter qiyun-api db:migrate` |

相关 env 见根目录 `.env.example`。Chat / Leads / Sites 在 postgres 模式走真 SQL；auth/documents/rag 部分域仍可能用 snapshot，以 `apps/api/src/runtime.ts` 为准。

工作区上下文：**仅信任 JWT + `POST /workspaces/:id/activate`**。`DEFAULT_WORKSPACE_ID` / `x-workspace-id` 仅供 Preview 与 BFF 兜底，Upstream 演示不应依赖。

1. 只改后端和工程层
2. 不抢 Cursor 的 UI 文件
3. 优先：测试、代码审查、联调兜底、后端补位
4. 每次输出：Findings、自动化结果、是否可合并、仍依赖项

## 当前分支

| 仓库 | 主开发线 | 说明 |
|------|----------|------|
| `qiyun-ai-c02` | `main` | 已 fast-forward 合并 D-03 + 控制台模式治理 |
| `qiyun-ai` | `feature/console-mvp-ui` | 有未提交控制台改动，待提交并合并 |

## 使用方式

### 自动化测试

见 [`docs/14-automated-test-plan.md`](docs/14-automated-test-plan.md)。

```powershell
.\scripts\run-quick-test.ps1      # ~15s 单元测试
.\scripts\run-full-test.ps1       # ~1min 含 build
```

你后续可以直接发：

- `让 Cursor 按 COMMAND.md 继续`
- `让 Cursor 先做 TUI-16`（联调验收，推荐当前首选）
- `让 Cursor 先做 TUI-17`（Leads / Sites 预留适配）
- `检查 Cursor 最新改动`
- `继续后端剩余功能`（Codex）
