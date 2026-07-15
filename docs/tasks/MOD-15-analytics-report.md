# Module 15 — Analytics Report 数据分析报告审计

**日期**: 2026-07-09 | **结论**: ✅ 6/6 端点 BFF 覆盖，无缺口

## 审计范围

- API 路由：`analytics-route.service.ts` (2 端点) + `sales-route.service.ts` (4 端点)
- BFF 路由：`/api/dashboard`, `/api/reports`, `/api/analytics/*` (6 文件)
- 业务层：`publicChatApi.getDashboardSnapshot`, `publicChatApi.getReportSnapshot`, `salesApi.getSalesOverview` 等

## API 端点矩阵

| # | 端点 | 方法 | Role Guard | BFF | 说明 |
|---|------|------|------------|-----|------|
| 1 | /dashboard | GET | — | ✅ | 概览看板 + mock fallback |
| 2 | /reports | GET | — | ✅ | 报表快照 |
| 3 | /analytics/sales-overview | GET | — | ✅ | 销售总览 |
| 4 | /analytics/conversion-funnel | GET | — | ✅ | 转化漏斗 |
| 5 | /analytics/channel-attribution | GET | — | ✅ | 渠道归因 |
| 6 | /analytics/sources | GET | — | ✅ | 来源分析 |

全部为 GET 端点，无角色守卫（所有 workspace 成员可查看）。统一使用 `parseAnalyticsQuery(url.searchParams)` 解析时间范围等查询参数。

## BFF 特点

- `/api/dashboard`: 有 `getUpstreamApiBaseUrl()` 检查 → 有上游则代理，无上游则返回 `dashboardWithBots` mock 数据
- 其他 5 个: 标准 `tryProxy` → 503 模式

## 结论

- **BFF 覆盖 100%**: 6/6 端点全部代理
- **角色保护**: 无守卫（所有成员可查看），符合分析报表的查看性质
- **V2 标注**: `conversion-funnel` / `channel-attribution` / `sources` 属于 V2 销售分析模块（工作记忆），但 API 和 BFF 已实装

**操作**: 无需修改。
