# 企云 AI V1 后端接口 — 与开发文档差距分析

> 对比对象：
> - 规格：`企云AI_V1后端接口与多企业隔离开发文档.docx`（约 109 个接口，14 个模块）
> - 现状：`apps/api/src`（NestJS 11 + Express 5 混合，手写路由分发，自研 HS256 JWT）
> - 日期：2026-07-09

---

## 0. 一句话结论

**功能覆盖约 7 成，核心闭环（询盘→分配→跟进→报价）已跑通；但有 2 个规格列为"最高优先级验收"的硬伤没做（sales 数据范围、审计日志），且 5 块后端完全没写（sales-links / selection-pages / quick-entry / follow-tasks / audit-logs）。响应体契约与文档不一致。**

---

## 1. 先对齐术语（规格 ↔ 你的实现）

| 规格用语 | 你的实现 | 说明 |
|---|---|---|
| `tenant_id` | `workspace_id` | **功能等价，仅命名不同**。隔离单元=工作区 |
| `boss` | `owner` | 唯一所有者，可 transfer-owner |
| `admin` | `admin` | 一致 |
| `sales` | `member`（含 `sales_member` 别名） | **角色名接近，但 member 未被限制数据范围** |
| `ai_assistants` | `bots` | 改名 |
| `knowledge_files` | `documents` | 改名 |
| `widget_sites` | `sites` | 改名 |
| `quotes` | `quote_opportunities` | 改名 |
| `customers` | 合并进 `leads`/`inquiries` 字段 | 无独立客户表 |
| `tenant_members` | `workspace_members` | 改名 |

> ⚠️ 规格要求 `data_scope = all | self`，**你的代码里完全没有 `data_scope` 字段/逻辑，恒等于 all**。

---

## 2. 模块覆盖度矩阵

| 模块 | 规格端点 | 现状 | 关键差异 / 缺失 |
|---|---|---|---|
| **auth 登录** | 6 | ⚠️ 部分 | 有 login/me/password-reset(request+confirm)/code(request+verify)；**缺 `logout`、`password/first-change`**；命名略有差异 |
| **tenant 企业资料** | 3 | ⚠️ 部分 | 有 `/workspaces`(current/profile)；**缺 `tenant/files/upload`（Logo/执照上传专用端点，仅有通用 `/files` 上传）** |
| **team 团队** | 10 | ✅ 基本覆盖 | `/workspace-members` CRUD+角色、邀请、激活、transfer-owner；缺 member 独立 disable/enable、reset-password 端点（用 PATCH status 近似） |
| **dashboard 工作台** | 3 | ⚠️ 部分 | 只有单一 `/dashboard`，**无 boss/sales/admin 角色分版** |
| **sales-links 销售链接** | 8 | ❌ **后端完全缺失** | 仅前端 UI，无表、无路由、无公开访问 |
| **selection-pages 选型页** | 10 | ❌ **后端完全缺失** | 仅前端 UI；含公开页 `/public/selection-pages/{slug}` 也无 |
| **widgets 官网 Widget** | 11 | ⚠️ 部分 | 有 `/sites` CRUD、`/bots` embed-code、`/public/widget/config`、`/public/chat/stream`、`/public/leads`；**缺 check-install、publish、install-code（你有 embed-code）、DELETE sites** |
| **quick-entry 快速录入** | 3 | ❌ **后端完全缺失** | 仅前端 UI；`ai-extract` 无后端 |
| **inquiries 询盘** | 12 | ⚠️ 部分 | 有 list/create/detail/PATCH/assign/request-missing-fields；**缺 `batch-assign`、`intent-level`、`invalid`、`lost`、`customer-info`、`convert-to-quote`、`files` 上传** |
| **follow 跟进** | 9 | ⚠️ 部分 | 线索跟进存 `leads.follow_up_records` JSONB、报价跟进有 `quote_follow_ups`；**缺独立 `follow_tasks` 实体（complete/delay/cancel/notes/material-request）及 follow-records 创建/详情端点** |
| **quotes 报价** | 15 | ⚠️ 部分 | 有 quote-opportunities list/create/detail/PATCH/follow-ups；**缺 `copy`、`send`、`deal`、`lost`、`void`、`valid-until`、`pdf-preview`、`pdf-download` 及 3 个公开报价端点** |
| **knowledge 知识库** | 12 | ⚠️ 部分 | 有 knowledge-bases + documents CRUD + reindex + chunks；**缺 reparse、disable/enable、tags、move-category、bind-assistants** |
| **ai-assistants AI助手** | 10 | ⚠️ 部分 | 有 bots CRUD + embed-code；**缺 copy、enable/disable、knowledge 绑定、publish、test-chat** |
| **analytics/reports 报表** | 6 | ⚠️ 部分 | 有 sales-overview/conversion-funnel/channel-attribution/sources/reports(list)；**缺 lost-reasons、reports/export、reports/{id}/download** |
| **notifications/audit 日志** | 4 | ⚠️ 部分 | 有 notifications list + read；**缺 `read-all`、以及整个 `audit-logs`（表+端点+埋点）** |

**缺失后端等效实现的接口合计约 40 个**（占规格 109 的 ~37%），分布：5 个完全缺失模块 + 各模块的"状态机/子操作/公开端点"细节。

---

## 3. 三大最高优先级缺口（规格第 9 章验收标准）

这些是规格明确写"最高优先级"的项，且已逐一验证：

### 3.1 🔴 sales 数据范围未隔离（已验证）
- `GET /inquiries` 路由只按 `intent`/`status`/`limit` 过滤，**不传 `owner_id`/`context.userId`**。
- 结果：sales（member）能看到整个工作区的全部询盘/报价，**`data_scope=self` 未落地**。
- 影响：跨销售数据泄露，违反规格验收第 3 条。
- 位置：`nest/sales/sales-route.service.ts:62-85`（list 无 owner 过滤）、`SalesService.listInquiries` 无 owner 条件。

### 3.2 🔴 audit_logs 完全缺失（已验证）
- 全仓无任何 `audit_logs` 表与业务审计埋点（仅有 `site_key_audits`、邀请投递审计）。
- 创建/编辑/删除/状态变更/导出/发送报价均不写审计。
- 违反规格验收第 7 条（审计日志）与第 11 章执行指令第 7 条。

### 3.3 🟠 缺统一租户隔离 helper
- 无 `applyTenantScope` / `fillCreateScope` 中央保障；隔离靠各 repository **手写** `where workspace_id = $1`。
- 风险：新增 repository 方法若漏写条件即跨租户泄漏，无兜底拦截层。
- 建议：加一个 scope 中间件/helper，并在 dispatcher 层强制所有业务查询带 `context.workspaceId`。

> 现状隔离本身是"约定式可信"：`x-workspace-id` 头可指定工作区，但 `assertWorkspaceAccess` 会校验该用户确属该 workspace，非盲目信任——这一点是安全的。

---

## 4. 响应体契约差异（需决策）

| 项 | 规格要求 | 你的现状 | 结论 |
|---|---|---|---|
| 成功返回 | `{code:0, message:"success", data:{}}` | `json()` 直接展开 body：`{...body, requestId}` | ❌ 不一致 |
| 分页返回 | `{data:{list,page,pageSize,total}}` | 未确认是否含该结构 | ⚠️ 需核对 |
| 错误返回 | `{code:403001, message, data:null}` | 未知错误体格式 | ⚠️ 需核对 |

- `json()` 实现见 `http/api-result.ts:46-61`，**不包裹 code/message**。
- 注意：前端 console 已按现格式对接，改 envelope 是**破坏性变更**。建议决策：要么维持现格式并标注文档偏差，要么做一次契约迁移（前端同步改）。

---

## 5. 路径/命名差异速览

- 前缀：`/api/v1/*` 会被 dispatcher `normalizePath` 剥离前缀后分发，**你的 `/inquiries` 等价于 `/api/v1/inquiries` 可访问**，无阻断问题。
- 子路径命名基本一致（如 `/inquiries/:id/assign` 你已有）。
- 主要 rename：quotes→quote-opportunities、ai-assistants→bots、knowledge/files→documents、widget_sites→sites。若前端严格按文档路径调用则需加兼容别名或改前端。

---

## 6. 公开端点对比

| 端点 | 规格 | 现状 |
|---|---|---|
| `/public/widget/config` | ✅ | ✅ 有（用 siteKey+botId+origin 校验） |
| `/public/widget/chat` | ✅ | ✅ 有（`/public/chat/stream`，命名不同） |
| `/public/widget/lead` | ✅ | ✅ 有（`/public/leads`） |
| `/public/quotes/{quoteToken}` | ✅ | ❌ 缺失 |
| `/public/selection-pages/{slug}` | ✅ | ❌ 缺失 |

> 你的公开端点用 `siteKey + botId + origin 域名白名单` 定位校验，而非规格说的 `slug/quoteToken` 模式；安全强度可接受，但契约形态不同。

---

## 7. 建议落地优先级（结合文档第 10 章 + 现状）

### P0 — 安全/合规（必做，否则验收不过）
1. **sales 数据范围隔离**：listInquiries/listQuotes/listFollowTasks 按 `context.userId` + role 加 owner 过滤；member(sales) 只看自己。
2. **audit_logs 表 + 埋点**：新增 migration；在创建/编辑/删除/状态变更/导出/发送报价处写审计。
3. **统一 tenant scope helper**：`applyTenantScope(query, ctx)` / `fillCreateScope(payload, ctx)`，dispatcher 层兜底。

### P1 — 闭环补齐（核心业务状态机）
4. inquiries 子操作：batch-assign、intent-level、invalid、lost、customer-info、convert-to-quote、files 上传。
5. quotes 状态机：copy、send、deal、lost、void、valid-until + pdf-preview/download。
6. follow_tasks 独立实体（表 + 端点：complete/delay/cancel/notes/material-request）+ follow-records 创建/详情。
7. knowledge / ai-assistants 状态操作：disable/enable、tags、move-category、bind-assistants、copy、publish、test-chat。

### P2 — 新增后端模块（当前纯前端）
8. **sales-links**（8 端点 + sales_links 表 + 公开访问）。
9. **selection-pages**（10 端点 + selection_pages 表 + 公开页/提交）。
10. **quick-entry**（ai-extract / 录入 / 生成询盘）。
11. **public quotes**（3 端点 + quoteToken 校验）。

### P3 — 契约对齐与测试
12. 响应体 envelope 决策（迁移 or 标注偏差）。
13. 路径命名兼容（加别名或改前端）。
14. 单元测试：跨租户访问拦截、sales 数据范围拦截、公开 token 校验（规格第 11 章硬要求）。

---

## 8. 验证依据（已核对）
- `/inquiries` GET 路由 `nest/sales/sales-route.service.ts:62-85` — 无 owner 过滤 ✅
- 全仓 `grep audit_log` 无业务审计 ✅
- 全仓无 `sales-links / selection-page / quick-entry / follow-task` 后端实现 ✅
- quotes 无 `send` 端点、`json()` 不包 code/message ✅
- tenant_id→workspace_id 术语映射（代码全仓使用 `workspace_id`）✅
