# MOD-09 · inquiry 询盘 — 审计结论

**Task ID**: MOD-09-inquiry  
**日期**: 2026-07-09  
**结论**: 零真实缺口，无需代码改动。

## 审计范围

查询询盘的完整链路：API 路由 → Service → Repository (PG + InMemory) → DB 表结构 → Console BFF 代理。

## 审计发现

### 路由覆盖率
所有 API 端点均有对应 Nest 路由 + Console BFF 代理：

| API 端点 | 方法 | Nest 路由 | BFF 代理 |
|----------|------|-----------|----------|
| /inquiries | GET | ✅ | ✅ |
| /inquiries | POST | ✅ | ✅ |
| /inquiries/:id | GET | ✅ | ✅ |
| /inquiries/:id | PATCH | ✅ | ✅ |
| /inquiries/:id/assign | POST | ✅ | ✅ |
| /inquiries/batch-assign | POST | ✅ | ✅ |
| /inquiries/:id/request-missing-fields | POST | ✅ | ✅ |
| /inquiries/:id/intent-level | POST | ✅ | ✅ |
| /inquiries/:id/invalid | POST | ✅ | ✅ |
| /inquiries/:id/lost | POST | ✅ | ✅ |
| /inquiries/:id/customer-info | PATCH | ✅ | ✅ |
| /inquiries/:id/convert-to-quote | POST | ✅ | ✅ |

### 安全保障
- 所有写操作：`assertWriteRole`（owner/admin/member）
- source_codes 创建 + business_rules 修改：`assertManagerRole`（owner/admin）
- 数据权限：`resolveOwnerScope` — member/viewer 只能看自己的询盘，owner/admin 看全部
- 租户隔离：所有 `InquiryRecord` PG 查询过滤 `workspace_id = $1`
- audit trail：`SalesApi` 层封装审计日志，覆盖所有写操作
- 错误链：`SalesAccessError` → 404，`SalesValidationError` → 400

### PG 持久化
- `runtime.ts` L503-504：`driver === "postgres" ? PostgresSalesRepository : InMemorySalesRepository`
- Migration 022 建表：inquiries + quote_opportunities + quote_follow_ups + source_codes + business_rules
- 索引：(workspace_id, status), (workspace_id, intent_level), (conversation_id UNIQUE)

### 非关键备注（不改）
1. `listInquiries` 每次触发 `syncWorkspaceInquiries` 全量扫描 leads+conversations+messages（N+1），属于 V2 性能优化
2. `listQuoteOpportunitiesByInquiry` PG 查询无 workspace_id filter（但调用方 `requireInquiry` 已确保隔离）

## 验收
- 无需代码改动
- 模块 09 审计通过，无功能/安全/正确性缺口
