# Module 11 — Quote 报价审计

**日期**: 2026-07-09 | **结论**: ✅ 无真实缺口，BFF 覆盖 11/12 端点

## 审计范围

- API 端点：`apps/api/src/nest/sales/sales-route.service.ts` L168-258 + L320-325
- BFF 路由：`apps/console/src/app/api/quote-opportunities/` (9 个文件)
- 前端页面：`apps/console/src/app/dashboard/quotes/` (11 个 page.tsx)
- 业务层：`apps/api/src/sales/sales.api.ts` (11 个 quote 方法)
- 持久层：`migration/022_sales_conversion_v2.sql` (`quote_opportunities` 表)

## API 端点清单

| # | 端点 | 方法 | Role Guard | BFF | 状态 |
|---|------|------|------------|-----|------|
| 1 | /quote-opportunities | GET | — | ✅ | ✅ |
| 2 | /quote-opportunities | POST | assertWriteRole | ✅ | ✅ |
| 3 | /quote-opportunities/:id | GET | — | ✅ | ✅ |
| 4 | /quote-opportunities/:id | PATCH | assertWriteRole | ✅ | ✅ |
| 5 | /quote-opportunities/:id/follow-ups | POST | assertWriteRole | ✅ | ✅ |
| 6 | /quote-opportunities/:id/copy | POST | assertWriteRole | ✅ | ✅ |
| 7 | /quote-opportunities/:id/send | POST | assertWriteRole | ✅ | ✅ |
| 8 | /quote-opportunities/:id/deal | POST | assertWriteRole | ✅ | ✅ |
| 9 | /quote-opportunities/:id/lost | POST | assertWriteRole | ✅ | ✅ |
| 10 | /quote-opportunities/:id/void | POST | assertWriteRole | ✅ | ✅ |
| 11 | /quote-opportunities/:id/valid-until | PATCH | assertWriteRole | ✅ | ✅ |
| 12 | /quote-opportunities/:id/public-token | POST | assertWriteRole | ❌ | ⏸️ V2 |

### 未覆盖说明

**#12 public-token**: API 端点实现在 route service L320-325，逻辑为 `return ok({ token: id, url: '/public/quotes/' + id })`——纯占位实现，不读取 body、不调用 service。Console 前端无任何引用（grep `public-token` / `publicToken` 零结果）。归属 V2 "报价公开分享链接" 功能，不计入 V1.0 缺口。

## 角色保护矩阵

| 操作 | 角色要求 |
|------|---------|
| 查看列表/详情 | 所有角色（tenant 成员） |
| 创建/编辑/跟进/复制/发送/成交/丢单/作废/有效期 | owner / admin / member (`assertWriteRole`) |

## 持久层验证

- PG 表：`quote_opportunities`（migration 022），含 workspace_id 租户隔离
- 索引：`idx_quote_opportunities_workspace` (workspace_id), `idx_quote_opportunities_status` (status)
- Repository 双模式：`InMemorySalesRepository` / `PostgresSalesRepository`，`runtime.ts` L503-504 按 `driver` 分支

## 前端集成

- 报价列表页：`/dashboard/quotes` → `QuotesManagementWorkspace` → `useApiResource("/quote-opportunities")`
- 报价详情页：`/dashboard/quotes/[id]` → `QuoteDetailWorkspace`
- 新建/编辑/预览/客户/模板 子页面均已创建

## 结论

报价模块是 **V1.0 最完整的模块之一**：
- 11 个核心 API 端点 100% BFF 代理覆盖
- 全部写操作有 `assertWriteRole` 角色守卫
- PG 持久化 + InMemory fallback 双模式
- 报价生命周期完整：创建 → 发送 → 成交/丢单/作废
- 前端 CRUD + 详情页完整

**操作**: 无需修改。
