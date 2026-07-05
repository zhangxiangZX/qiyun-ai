# Console 后端依赖清单（TUI-19）

> **受众：** Codex（`apps/api`、`apps/worker`、`migration`、`infra`）  
> **范围：** 仅描述 gap；前端 BFF 已就绪 ≠ 上游能力完整。  
> **契约参考：** [05-api-contract.md](./05-api-contract.md)  
> **联调说明：** [COMMAND.md](../COMMAND.md)

---

## 1. 如何阅读本文

控制台数据流分三层，排障时先确认卡在哪一层：

| 层 | 位置 | 含义 |
|----|------|------|
| **UI** | `apps/console/src/components/**` | 页面、空态、只读横幅 |
| **能力开关** | `lib/*/capabilities.ts`、`lib/*/data.ts` | 前端故意关闭写入/模拟，等后端就绪后改 `true` |
| **BFF** | `apps/console/src/app/api/**` | Next.js Route；`tryProxy` 转发至 `API_BASE_URL` |
| **上游** | `apps/api` | 真实业务与持久化 |

**重要：** `API_BASE_URL` 已配置时，Console 进入 **Upstream 模式**（顶栏显示「真实 API」）。此时若上游缺路由或鉴权失败，页面应展示真实错误 + 重试，**不得**静默回退 mock。

---

## 2. 优先级总览

| 级别 | 含义 | 条目数 |
|------|------|--------|
| **P0** | 阻塞 Upstream 端到端演示；不解决则 Console 联调无法闭环 | 6 |
| **P1** | 功能可用但数据不完整、不稳定，或与环境强相关 | 5 |
| **P2** | 生产就绪、安全与运维增强 | 4 |

**建议 Codex 执行顺序：** P0-1 → P0-2 → P0-3 → P0-4 → P0-5 → P0-6 → P1-* → P2-*

---

## 3. P0 — 阻塞 Upstream 正式演示

### P0-1. BFF 数据代理 JWT 透传

| 字段 | 内容 |
|------|------|
| **现象** | 配置 `API_BASE_URL` 后，Dashboard / 知识库 / 会话 / 线索等经 `tryProxy` 的请求可能 **401 Missing bearer token** |
| **根因** | `apps/api` 的 `requireAuthContext` 要求 `Authorization: Bearer <accessToken>` |
| **Console 侧** | ✅ `buildUpstreamHeaders` + `tryProxy` / `tryProxySse` 已透传 session `qiyun_access_token`（`apps/console/src/server/upstream-request.ts`） |
| **验收** | 登录 Console → 激活工作区 → `GET /api/dashboard`（经 BFF）返回 200 且数据属于当前工作区 |

**状态：** ✅ 已完成

---

### P0-2. `GET /bots/:id` 缺失

| 字段 | 内容 |
|------|------|
| **页面** | `/dashboard/bots/[botId]/*` |
| **BFF** | `GET /api/bots/[id]` → 代理 `/bots/:id`；**404 时从 `GET /bots` 列表兜底** |
| **上游现状** | ✅ `GET /bots/:id`（`apps/api/src/app.ts`） |
| **期望** | 返回与 Console `BotDetail` 可对齐的机器人详情（见 P0-3 字段） |
| **验收** | Upstream 模式下打开机器人编辑页，加载成功且无 404 |

**状态：** ✅ 已完成

契约：`docs/05-api-contract.md` 未显式列出 GET，但 Console 已依赖。

---

### P0-3. Bot 配置字段持久化不完整

| 字段 | 内容 |
|------|------|
| **页面** | 机器人基础 / 行为 / 线索 / 安装各子页 |
| **前端开关** | ✅ `BOTS_UPSTREAM_EXTENDED_FIELDS_ENABLED = true` |
| **Console 侧** | Upstream 下扩展字段可读写 |
| **上游现状** | ✅ `BotRecord` 含扩展字段；`PATCH /bots/:id` 合并更新（`migration/005_bot_settings.sql`） |
| **Console 额外字段** | `description`, `welcomeMessage`, `systemPrompt`, `collectLeadsOnFailure`, `rateLimitPerMinute`, `allowedDomains`, `leadFields`, `embedSnippet`（`apps/console/src/lib/bots/types.ts`） |
| **验收** | 修改 systemPrompt / welcomeMessage → 保存 → 刷新 → 字段保持 |

**状态：** ✅ 已完成

---

### P0-4. `PATCH /sites/:id`（域名白名单）

| 字段 | 内容 |
|------|------|
| **页面** | `/dashboard/sites` |
| **BFF** | `PATCH /api/sites/[id]` 已预留（`apps/console/src/app/api/sites/[id]/route.ts`） |
| **前端开关** | ✅ `SITES_UPSTREAM_DOMAIN_PATCH_ENABLED = true` |
| **上游现状** | ✅ `PATCH /sites/:id`（`allowedDomains` / `name` / `status`） |
| **期望 body** | `{ allowedDomains: string[] }`（可扩展 `status`） |
| **验收** | Console 可保存域名且无只读横幅 |

**状态：** ✅ 已完成

---

### P0-5. 线索 `GET /leads/:id` + Upstream 写入

| 字段 | 内容 |
|------|------|
| **页面** | `/dashboard/leads` |
| **BFF** | `GET/PATCH /api/leads/[id]` 已代理；**GET 404 时从列表兜底** |
| **前端开关** | ✅ `LEADS_UPSTREAM_WRITE_ENABLED = true` |
| **上游现状** | ✅ `GET /leads`、✅ `GET /leads/:id`、✅ `PATCH /leads/:id` |
| **验收** | Upstream 下列表、详情、保存 status/assignee/notes 全流程 |

**状态：** ✅ 已完成

---

### P0-6. Sites / 聊天数据跨重启（PostgreSQL 真持久化）

| 字段 | 内容 |
|------|------|
| **页面** | 站点、会话、线索、概览/报表 |
| **上游现状** | ✅ `API_RUNTIME_DRIVER=postgres` 时使用 `PostgresChatRepository`（`apps/api/src/chat/chat.postgres-repository.ts`），读写 `sites` / `conversations` / `messages` / `leads` 表；不再经 snapshot truncate/reinsert |
| **memory 模式** | 测试与本地默认仍用 `InMemoryChatRepository` |
| **验收** | 重启 API 后站点域名、会话 PATCH、线索 PATCH 均保留 |

**状态：** ✅ 已完成

**验证命令：**

```bash
# 需 Postgres + migration
API_RUNTIME_DRIVER=postgres pnpm --filter qiyun-api db:migrate
API_RUNTIME_DRIVER=postgres pnpm --filter qiyun-api dev
# PATCH 站点域名 → 重启 API → GET /sites 字段仍在
```

---

## 4. P1 — 联调稳定性与数据质量

### P1-1. `PostgresChatRepository`（真 SQL，替代内存 + 快照）

| 字段 | 内容 |
|------|------|
| **状态** | ✅ 已随 P0-6 完成（chat 域）；auth / documents / rag 仍为 snapshot 模式 |
| **验收** | 集成测试覆盖 list/get/patch 会话与线索 |

### P1-2. runtime `memory` / `postgres` 切换文档化

| 字段 | 内容 |
|------|------|
| **env** | `API_RUNTIME_DRIVER=memory|postgres`（`apps/api/src/config/env.ts`） |
| **期望** | `.env.example` + COMMAND 写明开发/演示/生产推荐组合 |
| **验收** | 新环境按文档一键切换，无隐式 `ws_dev` 串数据 |

**状态：** ✅ 已完成（见 `COMMAND.md` Codex 执行规则）

### P1-3. 工作区上下文单一来源

| 字段 | 内容 |
|------|------|
| **契约** | `docs/05-api-contract.md`：切换工作区用 `POST /workspaces/:id/activate`，不信任 body 内 workspaceId |
| **现状** | API 用 JWT 内 `activeWorkspaceId`；BFF 仍发送 `x-workspace-id`（上游忽略） |
| **期望** | Upstream 全链路仅以 session + activate 为准；`DEFAULT_WORKSPACE_ID` 仅 Preview 兜底 |
| **验收** | 两工作区切换后，Dashboard 数字随工作区变化 |

**状态：** ✅ 文档化完成；Preview 兜底保留

### P1-4. 知识库解析 / 索引 Worker 可靠性

| 字段 | 内容 |
|------|------|
| **页面** | `/dashboard/knowledge-bases` |
| **现状** | 上传经 BFF multipart 代理；解析队列依赖 Redis/worker 配置 |
| **期望** | 文档状态 `processing → ready/failed` 可追踪；失败可读错误 |
| **验收** | PDF 上传 → 索引完成 → 机器人预览可引用 |

### P1-5. 会话列表规模与分页

| 字段 | 内容 |
|------|------|
| **页面** | `/dashboard/conversations` |
| **现状** | ✅ 上游 `GET /conversations?limit&cursor`；Console「加载更多」+ 客户端筛选（TUI-24/TUI-28） |
| **缺口** | ~~筛选条件未下推至 API~~；`CONVERSATIONS_SERVER_FILTER_ENABLED` 已翻转 |
| **验收** | 1k+ 会话时分页加载；选中态在加载更多后保持；筛选空态可重置 |

**状态：** ✅ 已完成（`GET /conversations?botId&status&hasLead&q`）

---

## 5. P2 — 演示增强 / 生产就绪

### P2-1. 真实 LLM token streaming

| 字段 | 内容 |
|------|------|
| **页面** | Bot 预览、`POST /public/chat/stream`、Widget |
| **现状** | 🟡 配置 `LLM_*` 后上游逐 token SSE；无 citations 时仍可能规则回复 |
| **验收** | Widget 流式输出与 Console 预览一致 |

**状态：** 🟡 主路径已通；边缘 fallback 待观测

### P2-2. site key hash / rotate key 生产化

| 字段 | 内容 |
|------|------|
| **页面** | `/dashboard/sites` |
| **现状** | ✅ hash 查找 + rotate 失效；`site_key` 明文仅创建/轮换时一次性返回 |
| **期望** | 仅存 hash；轮换后旧 key 立即失效；审计日志 |
| **验收** | 轮换后旧 siteKey 调 chat 返回 401/403 |

**状态：** ✅ 已完成（hash 查找 + rotate 失效 + `site_key_audits`）

### P2-3. rate limit

| 字段 | 内容 |
|------|------|
| **场景** | 公共聊天、登录、邀请重发 |
| **现状** | 🟡 公共聊天 per-bot+visitor、登录/注册 per-IP 已有限流 |
| **期望** | 全局限流 + Console/Widget 展示 `RATE_LIMITED` |
| **验收** | 压测触发限流，Console/Widget 展示可读错误 |

**状态：** ✅ 已完成（`api.global.ip` 600/min + 各路由 named limit；429 `RATE_LIMITED`）

### P2-4. Docker / 部署联调收尾

| 字段 | 内容 |
|------|------|
| **期望** | `docker compose up` 后 Console + API + Worker + Postgres + Redis + Qdrant 可演示 |
| **验收** | 新同事按 README 30 分钟内完成 Upstream 全路径 |

**状态：** 🟡 Compose 文件已有；30 分钟 onboarding 待实机验收

## 6. 前端能力开关（后端就绪后由 Cursor 翻转）

| 开关 | 文件 | 何时改为 `true` |
|------|------|-----------------|
| `LEADS_UPSTREAM_WRITE_ENABLED` | `lib/leads/capabilities.ts` | ✅ 已开启（P0-5 PATCH 可用） |
| `SITES_UPSTREAM_DOMAIN_PATCH_ENABLED` | `lib/sites/capabilities.ts` | ✅ 已开启（P0-4） |
| `SITES_TEST_MESSAGE_UPSTREAM_ENABLED` | `lib/sites/capabilities.ts` | ✅ 已开启 |
| `BOTS_UPSTREAM_EXTENDED_FIELDS_ENABLED` | `lib/bots/capabilities.ts` | ✅ 已开启（P0-3） |

无需改开关（已默认上游）：`LEADS_BFF_READY`、`SITES_BFF_READY`、`BOTS_API_AVAILABLE`、`DASHBOARD_API_AVAILABLE`、`ANALYTICS_API_AVAILABLE`、`CONVERSATIONS_METADATA_PERSISTENT`。

---

## 7. 已验收（Console Upstream 路径，TUI-16 / TUI-18）

以下在 **BFF 代理成功且上游已实现** 的前提下，UI 已具备 loading / empty / error / success / 工作区切换重载：

| 能力 | Console BFF | 上游路由（apps/api） | 页面 |
|------|-------------|---------------------|------|
| 概览 | `GET /api/dashboard` | `GET /dashboard` | `/dashboard` |
| 报表 | `GET /api/reports` | `GET /reports` | `/dashboard/reports` |
| 知识库 CRUD + 上传 | `/api/knowledge-bases/**` | `/knowledge-bases`, `/documents/**` | `/dashboard/knowledge-bases` |
| 会话读 + PATCH 元数据 | `/api/conversations/**` | `GET/PATCH /conversations/:id` | `/dashboard/conversations` |
| 团队 / 邀请 | `/api/auth/**`（`proxyAuthRequest`） | `/auth/*`, `/workspace-*` | `/dashboard/team`, `/dashboard/invitations` |
| 机器人列表/创建/保存 | `/api/bots` | `GET/POST/PATCH /bots`（字段见 P0-3） | `/dashboard/bots` |
| 线索列表 | `/api/leads` | `GET /leads` | `/dashboard/leads` |
| 站点列表 + 轮换密钥 | `/api/sites/**` | `GET /sites`, `POST .../rotate-key` | `/dashboard/sites` |
| 工作区切换 | `/api/auth/workspaces/.../activate` | 同左 | 顶栏 |

---

## 8. 契约与实现差异（供 Codex 对齐）

| 契约（05） | 当前实现 | 建议 |
|------------|----------|------|
| `GET /analytics/overview` | 实际为 `GET /dashboard` | 统一命名或 BFF 别名 |
| `PUT /bots/:id/knowledge-bases` | 合并在 `PATCH /bots/:id` 的 `knowledgeBaseIds` | 文档注明或补专用路由 |
| `GET /bots/:id/embed-code` | Console 本地拼接 snippet | 可选：上游返回 embed-code |
| 前缀 `/api/v1` | 当前无 v1 前缀 | MVP 可保持，生产前统一 |

---

## 9. E2E 验收脚本（人工 / CI 共用）

配置 `.env`：`API_BASE_URL=http://localhost:3001`（示例），Console 与 API 同用户登录。

1. 登录 → 顶栏「真实 API」→ 切换工作区 → 概览数字变化  
2. 知识库：创建 → 上传 TXT → 等待 ready → 机器人关联知识库  
3. 机器人：创建 → 编辑 behavior 保存 → **刷新验证字段**（P0-3）  
4. 会话：打开详情 → 改 status/tags → 刷新保持  
5. 线索：列表加载 → 打开详情 → PATCH 保存（P0-5 开关打开后）  
6. 站点：rotate key → **保存域名**（P0-4 开关打开后）  
7. 团队：邀请成员 → 接受邀请链路  

任一步出现 401，先查 **P0-1 JWT 透传**。

---

## 10. 变更记录

| 日期 | Task | 说明 |
|------|------|------|
| 2026-06-30 | TUI-16 | 初版清单 + 联调 UI 修复 |
| 2026-06-30 | TUI-17 | Leads/Sites 能力开关与 BFF 预留 |
| 2026-06-30 | P0-1 fix | Console `tryProxy` / `tryProxySse` 透传 session Bearer |
| 2026-07-01 | TUI-28 | 团队/邀请/机器人编辑模式横幅；会话 capabilities 筛选提示 |

### P1-6. 文档存储 MinIO SDK（Console 不可感知）

| 字段 | 内容 |
|------|------|
| **页面** | `/dashboard/knowledge-bases` |
| **现状** | 上游默认 `LocalDocumentStorage`（`DOCUMENT_STORAGE_DIR`）；MinIO 环境变量已存在但无 SDK 接入 |
| **Console** | ✅ TUI-24 已在页内诚实说明 local/MinIO 由后端环境决定 |
| **验收** | `DOCUMENT_STORAGE_DRIVER=minio` 时上传文件可在 MinIO 控制台看到对象 |

**状态：** ✅ 已完成（AWS SigV4 直连接 MinIO；见 `MinioDocumentStorage`）

---

*本文档仅描述 gap，不修改 `apps/api`。实现完成后请更新本文件对应条目并通知 Cursor 翻转能力开关。*
