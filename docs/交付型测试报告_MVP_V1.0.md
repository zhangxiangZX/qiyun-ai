# 交付型测试报告 · AI云 工业官网获客系统 MVP V1.0

> 测试时间：2026-07-07
> 测试环境：内存模式（`API_RUNTIME_DRIVER=memory` + `API_SEED_PREVIEW=true`），API:3001 / Console:3000
> 测试方法：静态代码审计（3 个专项 agent）＋ 运行时冒烟（页面 HTTP 探活）＋ 后端闭环脚本验证
> 结论：**核心业务链路可跑通，但销售/客户域多个页面用 DEMO 假数据误导用户，是交付前必须修复的阻断项。**

---

## 一、健康度基线（AGENTS.md 验证流程）

| 检查 | 结果 | 备注 |
|---|---|---|
| typecheck | ✅ 6/6 | 已修 `business-rules-workspace.tsx` 的 `tabCounts` 未定义 bug |
| lint | ✅ 6/6 | 仅 api 包 9 个 warning（未用变量） |
| test | ✅ 6/6 | 88 用例 0 失败 |
| build | ✅ 5/5 | — |

---

## 二、运行时冒烟（页面探活）

重启干净的 Console 后，对 **31 个关键路由** 做 HTTP 探活，**全部返回 200，无 SSR 崩溃**。

> ⚠️ 重要澄清：测试开始时环境里有一个**卡死的 Next dev 僵尸进程（PID 17220，占 2.1GB 内存）**，导致所有 Console 路由返回 500。杀掉重启后全部 200。此 500 **是环境故障，不是代码缺陷**。

BFF 代理鉴权正常：未登录访问 `/api/leads` 等返回 **401**（正确拒绝），登录后可正常代理到后端。

---

## 三、MVP 闭环验证（端到端脚本）

跑通公网关键路径 + 登录后后台验证：

| 步骤 | 端点 | 结果 |
|---|---|---|
| 1. 企业管理员登录 | POST /auth/login (owner@qiyun.ai) | ✅ 200 |
| 2. Widget 配置 | GET /public/widget/config | ✅ 200 |
| 3. SSE 流式聊天 | POST /public/chat/stream | ✅ 200，流式输出，`needsLeadCapture=true` |
| 4. 访客留资 | POST /public/leads | ✅ 201，创建线索 |
| 5. 线索进后台 | GET /leads (登录) | ✅ 列表含新线索 |
| 6. 销售跟进 | PATCH /leads/:id | ✅ 200 状态变更 |
| 7. Dashboard 真实数据 | GET /analytics/sales-overview | ✅ 200 真实聚合 |
| 8. 会话列表 | GET /conversations | ✅ 200 |

**MVP 闭环（D 模块 Widget + E 模块留资 + F 模块线索 + G 模块 Dashboard）完整打通，PASS ✅。**

> 备注（非阻断）：`bot-sales` 的 `recommendedQuestions` 为 0（仅 `bot-support` 种子了推荐问题）；内存模式下 RAG 无真实文档，回答会走"资料不够细"的兜底话术——属 preview 环境特性，接真实知识库后正常。

---

## 四、缺失页面与导航缺口

**结论：MVP 各模块入口页齐全，无 P0 缺失页面。** 真正的问题是"建好但到不了"和"详情页无独立路由"。

### 4.1 断裂链接
**无。** 导航（`lib/navigation.ts`）27 个入口全部能对应到真实 `page.tsx`。

### 4.2 孤儿页面（建好但无任何入口可达）
| 页面 | 说明 | 建议 |
|---|---|---|
| `/dashboard/reports/bot-insights` | 机器人洞察报表，全仓无链接 | P2：挂回报表 tab 或隐藏 |
| `/dashboard/customers/repurchase` | 复购提醒，仅在注释里出现 | P2：挂回客户菜单或隐藏 |

### 4.3 已建但未挂回主导航的页面
`team/roles`、`team/billing`、`reports/follow-up`、`reports/lost-reasons`、`reports/export`、`sales-assistant`、`customers/repurchase` —— 功能页已存在，但侧边栏无入口（仅页内 tab/按钮可到）。建议统一在导航中标"即将上线"灰显，或正式挂回。

### 4.4 缺独立详情路由（P1）
| 应有页面 | 现状 | 影响 |
|---|---|---|
| 会话详情 `/dashboard/conversations/[id]` | 仅列表页，详情走抽屉/弹窗 | 不可深链/分享 |
| 线索详情 `/dashboard/leads/[id]` | 仅列表页，详情走抽屉/弹窗 | 不可深链/分享 |

若交付要求"可深链的独立详情页"，需补建这两个路由。

---

## 五、数据真实性问题（⛔ P0 交付阻断项）

这是本次测试**最严重**的发现。主体数据链路是真实的（Dashboard、Leads、Conversations、Inquiries、Quotes 列表、Bots、Knowledge、Sites 在 upstream 模式均走真接口，失败诚实报错）。但**销售/客户域以下子页用 `DEMO_*` 假数据兜底/混入，会误导用户以为看到了真实业务数据**：

| # | 页面 | 问题 | 严重度 |
|---|---|---|---|
| 1 | **客户详情** `/dashboard/customers/detail` | `useState(DEMO)` 打底，`{...DEMO, ...覆盖}` 仅覆盖少数字段；API 异常时 `catch` 静默回退整份假数据 + 顶部小字"已展示示例内容"；`responseRate/satisfaction/winProbability` 由 id 哈希伪造 | **P0（最严重）** |
| 2 | **客户运维** `/dashboard/customers/ops` | 空数据显示写死 `DEMO_KPIS`（潜在客户 2856、意向 1582…）；数据<3 条时混入 `DEMO_RECORDS` 假记录 | **P0** |
| 3 | **复购提醒** `/dashboard/customers/repurchase` | 真实行与 `DEMO_ROWS` 直接拼接展示 | **P0** |
| 4 | **渠道转化报表** `/dashboard/reports`（主报表） | 真实渠道<2 条时混入 `DEMO_CHANNELS`；趋势折线永远用 `DEMO` 假数组 | **P0** |
| 5 | **报价详情** `/dashboard/quotes/[id]` | "产品明细""附件"区块永远显示 `DEMO_PRODUCTS`/`DEMO_ATTACHMENTS`，与真实报价头同屏 | **P0** |
| 6 | **业务规则** `/dashboard/settings/business-rules` | 规则清单永远是 `DEMO_RULES` 骨架，仅注入一条真实字段 | **P1** |

**修复方向**：移除 `{...DEMO}` 打底与空数据兜底；真实数据为空时显示真·空状态；指标必须从 API 聚合，禁止前端哈希编造。这些页面在 preview 演示场景下可用 DEMO，但必须在 clearly-labeled 演示态才展示（复用已有的 `ConsoleDataModeBanner`）。

---

## 六、UX / 体验问题清单

### 6.1 死按钮 / 假交互（P1）
| 位置 | 现象 |
|---|---|
| `after-sales-workspace.tsx:424,428` | "转交工单""挂起工单"仅 `title="即将上线"`，无 `disabled` 无 `onClick` |
| `after-sales-workspace.tsx:693-712` | 5 个快捷操作按钮全部死按钮 |
| `inquiry-detail-workspace.tsx:566,574` | "指派销售""转工程师"死按钮 |
| `customer-ops-workspace.tsx:321` | "导出数据"无 `onClick` |
| `ai-standalone-workspace.tsx:325` | "新建选型页"无 `onClick` |
| `customer-ops` / `follow-up-tasks` 多处 | `href="#"` 假链接，点击跳页顶 |

### 6.2 硬编码欺骗性数据（P1）
- `customer-ops` 空数据显示假 KPI（见 5.2），趋势百分比写死数组字面量
- `ai-standalone-workspace.tsx:294` 统计卡趋势写成 `"1 20.0%"` 畸形字符串
- `lib/dashboard/mock-data.ts` 演示仪表盘用 `Math.sin` 生成趋势；主仪表盘 `v2-dashboard-workspace` 无"演示数据"横幅，用户分不清真假

### 6.3 缺失空/加载/错误态（P1）
- `ai-standalone-workspace.tsx` 选型页列表无"暂无数据"分支
- `customer-ops` 出错时不给错误态，反而用 `DEMO_*` 撑场面（比白屏更具欺骗性）

### 6.4 占位痕迹泄漏（P1/P2）
- `ai-standalone-edit-workspace.tsx:491,559` 表格列头/表单 label 直接写中文"占位提示"
- `placeholder-page.tsx:38` 通用占位页默认英文 "Coming Soon"，对中文用户无信息量
- `reports/follow-up`、`lost-reasons`、`export` 三页纯"V2 开发中"占位（已诚实标注，可接受）

### 6.5 术语 / 设计系统不一致（P2）
- 导航"跟进任务"指向线索页，页内标题却是"线索"（同一功能两种叫法）
- 询盘/线索/商机/报价 概念在不同页面混用，缺统一术语表
- 销售组内 V2 设计系统（`ConsolePage`）与旧 CSS Module 并存，视觉割裂
- `home-overview-parts.tsx:62-79` 分页数字按钮无 `onClick`，翻不了页
- 旧 CSS Module 页面移动端响应式弱（风险，需真机验证）

### 6.6 无障碍（P2）
- 死按钮仅 `title` 提示，无 `disabled`/`aria-disabled`/`aria-label`

---

## 七、优先级汇总

### ⛔ P0（交付前必须修，假数据误导）
1. 客户详情（5.1）
2. 客户运维（5.2）
3. 复购提醒（5.3）
4. 渠道转化报表（5.4）
5. 报价详情产品/附件（5.5）

### 🔶 P1（重要体验，建议本版修）
- 业务规则恒 DEMO（5.6）
- 死按钮（6.1）、`href="#"` 假链接
- 硬编码 KPI/趋势（6.2）、缺空/错误态（6.3）
- 占位痕迹泄漏（6.4）
- 孤儿页可达性（4.2）、会话/线索详情独立路由（4.4）

### 🔹 P2（打磨，可排期）
- 术语统一、设计系统收敛、分页修复、响应式、a11y
- 未挂回导航的已建页面（4.3）

---

## 八、下一步建议

1. **立即修 P0**：5 个假数据页面移除 `{...DEMO}` 打底 + 空数据兜底，统一接真实 API；预览态用 `ConsoleDataModeBanner` 明确标识。
2. **清理死按钮**：所有 `title="即将上线"` 按钮统一 `disabled` 置灰或点击给 toast；修掉 `href="#"`。
3. **可深链详情页**：评估是否补 `conversations/[id]`、`leads/[id]` 独立路由。
4. **收口孤儿/未挂导航页**：要么挂回侧边栏标"即将上线"，要么隐藏入口。
5. **统一设计系统**：制定 V2 `ConsolePage` 迁移计划，新页面不再用旧 CSS Module。

> 测试脚本与探活结果可复现；修复后建议重跑本报告的闭环脚本与页面探活做回归。
