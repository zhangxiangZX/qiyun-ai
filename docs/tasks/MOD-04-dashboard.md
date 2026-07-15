# MOD-04 dashboard 概览看板

> 18 模块主线第 4 站。前序：01-auth-account、02-tenant-company、03-team-role-permission 已完成验证。
> 模式：先全量审计看板后端（tenant 隔离 / 角色 / 聚合成本），后最小修补。

## 1. 任务用户价值与闭环环节
- **闭环环节**：数据看板 / 经营概览（产品闭环的"数据反馈"环节）。
- **价值**：看板是只读聚合，所有角色可看属正确；但存在两个真实缺陷：
  1. `recentLeads` 未按时间排序，名为"最近线索"却返回无序前 5 条。
  2. 每次请求加载全量历史对话 + 线索 + 逐条消息（N+1），无默认时间窗，
     在 10 万级数据下必然超 200ms，违背"sub-200ms / 100k+ entities"成功指标。

## 2. 不做什么
- 不重构为 SQL 聚合（属更大改造，记入观察项，非本轮）。
- 不改 `/reports` 端点（属模块 15 analytics-report，保持自有显式时间范围）。
- 不改 KPI 计算逻辑、不改前端、不新增 migration、不引入缓存层。

## 3. 修改 / 不修改文件清单
**修改**
- `apps/api/src/chat/chat.api.ts`
  - 新增 `defaultFromDate(days)` 助手（返回 YYYY-MM-DD，UTC）。
  - `getDashboardSnapshot`：未显式给 `from/to` 时，默认按最近 30 天窗口聚合（effectiveQuery），避免全量历史 + N+1 扫描。
  - `recentLeads`：`.slice().sort(createdAt desc).slice(0,5)`，确保"最近"语义正确。
- `apps/api/src/chat/chat.api.dashboard.test.ts`（新增，PG-free 单测）
- `scripts/run-api-tests.mjs`（登记新测试）
- `docs/tasks/MOD-04-dashboard.md`（本文件）

**不修改**：rag/sales/analytics 其他路由、前端、migration、reports 逻辑。

## 4. 验收方式
- `pnpm --filter qiyun-api typecheck` → 0 错。
- scoped eslint 仅对改动文件 → 0 错。
- `node --test dist/chat/chat.api.dashboard.test.js` → 3/3 通过：
  1. recentLeads 按 createdAt 倒序（l_new/l_mid/l_old）；
  2. 30 天窗口过滤掉 60 天前对话（trend30/trend7 仅计 1，旧问题不进 frequentQuestions）；
  3. 无 bot 时返回 hasBots=false 空载荷。
- 既有集成测试 `app.test.ts` dashboard 用例（数据在"now"创建，落在 30 天窗内）不受影响。

## 5. 是否超出 P0/P1
否。属 V1.0 看板性能/正确性补齐，无新功能、无 schema 变更、无前端改动。

## 6. 审计结论（为什么只改这两点）
全量扫描 `getDashboardSnapshot` / `collectWorkspaceAnalytics`：
- **租户隔离 ✅**：`collectWorkspaceAnalytics` 经 `listConversationsByWorkspace(workspaceId)` / `listLeadsByWorkspace(workspaceId)` / `listBotsByWorkspace(workspaceId)` 全部按 workspaceId 过滤，无跨租户泄漏。
- **角色 ✅**：看板为 GET 只读聚合，所有角色可看，符合概览定位（与 chat/sales 的 viewer 只读一致）。
- **输出有界 ✅**：frequentQuestions / unresolvedQuestions 已 `.slice(0,5)`。
- **两个缺陷（已修）**：
  - `recentLeads` 未排序（`.slice(0,5)` 吃无序前 5 条）→ 改为按 createdAt 倒序。
  - 聚合无默认时间窗，每次请求 `listConversationsByWorkspace` 全量 + 逐条 `listMessagesByConversation`（N+1）→ 默认 30 天窗，命中"概览=近期"语义且显著降低扫描与查询量。

## 7. 紧邻下一步
- **模块 05-sales-link-qrcode 获客链接/二维码**：审计获客链接创建/列表/跳转统计的租户隔离与角色（写操作应 owner/admin/member，统计只读）。
