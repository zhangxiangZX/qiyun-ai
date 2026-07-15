# MVP V1.0 差距追踪

> 唯一开发边界：`docs/AI云_第一版全部功能可用清单_MVP_V1.0.md`  
> V2 需求统一放入 `docs/BACKLOG.md`。未列入本清单的需求，不进入 V1.0。

最后更新：2026-07-08

## 状态说明

| 状态 | 含义 |
|------|------|
| DONE | 已实现且已有验证 |
| PARTIAL | 已有实现，但仍有缺口 |
| MISSING | 尚未实现 |
| V2 | 明确不在 V1.0 |

---

## 模块进度摘要

| 模块 | 状态 | 当前说明 |
|------|------|----------|
| A 账号与工作区 | DONE | 平台超管、工作区开通、角色矩阵已落地 |
| B 知识库 | DONE | 上传、失败码、删除、解析、Worker 测试链路已打通 |
| C 机器人 | DONE | 基础配置、推荐问题、业务规则（仅知识库/低置信转人工）、对话测试、上下线状态 UI 均已实装 |
| D Widget | DONE | 基础挂件、SSE 聊天、安装向导与 Widget 加载校验已完成 |
| E 留资 | DONE | 附件 ready/failed、同会话去重、通知后端已通 |
| F 会话 / 线索 | DONE | 6 态线索、附件展示、跟进时间线持久化 |
| G Dashboard | DONE | 概览/报表真实 API + 日期/机器人筛选 |
| H 站点 | DONE | site key、域名白名单、安装向导与 Widget 校验 |
| I 交付与验收 | PARTIAL | 脚本已有；需 Console+API 实机跑 `run-demo-acceptance.ps1` |

---

## Codex / API

| ID | 状态 | 说明 |
|----|------|------|
| B-07 ~ B-12 | DONE | 角色矩阵、线索状态机、通知、Worker、解析、渠道统计 |
| E-04 | DONE | 附件 `status`/`errorMessage`；失败不可下载 |
| E-08 | DONE | 同会话去重 201 合并；契约见 `05-api-contract.md` |
| F-08 | DONE | `follow_up_records` JSONB + PATCH 追加时间线 |
| N-01 / N-02 | DONE | 通知已读持久化 + kind/中文文案 |
| D-01 / C-01 | DONE | Dashboard/Reports/Conversations 筛选下推 |

## Cursor / 前端

| ID | 状态 | 说明 |
|----|------|------|
| A-07 / A-08 | DONE | 登录注册 + 邀请激活 |
| F-05 / F-08 | DONE | 线索附件区 + 时间线（读 API `followUpRecords`） |
| G-01 / G-02 | DONE | 概览 + 报表 Upstream 筛选 UI |
| H-05 / H-06 | DONE | 安装向导、Widget 加载检测 |

---

## 当前发布门槛

1. **部署 migration**：`014_notification_reads.sql` + `015_lead_follow_up_records.sql`
2. **I-09 实机验收**：`scripts/run-demo-acceptance.ps1`（Console + API 需已启动）
3. **Upstream E2E**：`docs/12-console-backend-gaps.md` §9 七步人工脚本

## 仍属 P2 / 非阻塞

- P2-1 LLM 无 citations 时的规则 fallback 观测
- P1-4 Worker 生产环境长时间稳定性压测
- P2-4 新同事 30 分钟 Docker 上手（文档已有，需实机验证）
- 正式 NestJS controller 迁移（Framework 层）

---

## ⚠️ 超 V1.0 边界已实装功能（归 V2，不计入 V1.0 验收）

> **PM 决策（2026-07-08）**：以下代码已在仓库实装（含真实后端数据模型 + repository + API），但**均不在 MVP 清单 A–I 范围内**，违反护栏 §2.1 P2 的「CRM 全功能 / 复杂订阅计费 / 全渠道深度客服」不做条款。
> 决策：**代码保留，明确归 V2，不计入 V1.0 验收范围**。V1.0 验收仅锁定 A–H 模块 + I 交付验收。

| 功能域 | 实装证据（代码位置） | 违反护栏条款 |
|--------|----------------------|--------------|
| CRM 客户域（客户档案/运营/复购提醒/工单中心） | `apps/api/src/sales/*`、`apps/console/src/components/sales/*`、`CustomerOpportunityItem`、`CustomerOperationRecommendation` | P2 CRM 全功能 |
| 报价/商机管理（`QuoteOpportunityRecord`：估算/报价/赢单金额、丢单原因） | `apps/api/src/sales/sales.types.ts` | P2 CRM 全功能 |
| 成交漏斗 / 渠道归因 / ROI（`ConversionFunnelStep`、`ChannelAttributionItem`、`SourceAnalyticsItem`） | `apps/api/src/sales/*`、`apps/console/src/components/sales/*` | P2 CRM 全功能 |
| 多渠道接入（`SourceType`: douyin/wechat/expo；抖音/小红书/微信渠道配置、AI 选型独立页） | `apps/console/src/components/channels/*`、`navigation.ts` | P2 全渠道深度客服 |
| 套餐与账单（计费） | `navigation.ts` 套餐与账单菜单 | P2 复杂订阅计费 |
| 销售助手 AI（`SalesAssistantAnalyzeResult`） | `apps/api/src/sales/*` | P2 CRM 全功能 |

**处置**：详细登记见 `docs/BACKLOG.md`「已实装但未纳入 V1.0 的功能（归 V2）」。V1.0 发布时，这些页面可在演示中隐藏或标注「V2 预览」，不得作为 V1.0 交付承诺。
