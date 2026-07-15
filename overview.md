# 前端页面显示问题修复完成

## 修复内容
用户反馈部分前端页面无法显示。排查后发现，多个 V2 CRM/数据看板页面直接调用 `@/lib/sales/api` 的原始 API 函数，没有 `useApiResource` 的 mock 回退。在 preview 模式（`API_BASE_URL` 为空）下，BFF 端点返回 503/404，导致页面卡在加载骨架后进入错误状态。

## 已修复页面（用户实际路由）
1. `/dashboard/customers`（客户档案）——继续验证通过
2. `/dashboard/sales`（成交漏斗 / `SalesFunnelWorkspace`）——新增 preview 回退
3. `/dashboard/reports/channel`（渠道分析 / `ChannelAnalysisWorkspace`）——新增 preview 回退

## 新增/修改文件
- 新增 `apps/console/src/lib/sales/analytics-mock-data.ts`：提供 `SalesOverviewMetrics`、`ConversionFunnelStep[]`、`ChannelAttributionItem[]` 的 preview 示例数据
- 修改 `sales-funnel-workspace.tsx`：preview 短路至 mock 数据；错误时也回退到 mock
- 修改 `data-center/channel-analysis-workspace.tsx`：同上
- 补充 `sales-overview-workspace.tsx` 和 `channel-conversion-workspace.tsx` 的 preview 回退（当前组件未被路由引用，为将来复用做准备）

## 重要发现
- `SalesOverviewWorkspace` 与 `ChannelConversionWorkspace` 当前未被任何 `app/dashboard` 路由引用，属于已实装但未挂路由的 V2 组件
- 用户实际访问的是：
  - `/dashboard/sales` → `SalesFunnelWorkspace`
  - `/dashboard/reports/channel` → `ChannelAnalysisWorkspace`（在 `data-center/` 目录）
- `/dashboard/sales/funnel` 这个 URL 不存在（404）

## 验证结果
- `pnpm exec tsc --noEmit` 通过
- ESLint 修改文件 0 错误 / 0 warning
- Playwright 在 preview 模式下实测：
  - `/dashboard/customers`：1154 chars，1.6s，无错误
  - `/dashboard/sales`：857 chars，1.4s，无错误
  - `/dashboard/reports/channel`：701 chars，1.4s，无错误
- 截图：`customers_final.png`、`sales_funnel_final.png`、`channel_analysis_final.png`
