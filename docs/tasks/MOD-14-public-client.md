# Module 14 — Public Client 公开客户端审计

**日期**: 2026-07-09 | **结论**: ✅ 完整，无缺口

## 审计范围

- API 路由：`apps/api/src/nest/chat/chat-route.service.ts` (5 端点) + `apps/api/src/nest/public/public-route.service.ts` (5 端点)
- API 业务层：`apps/api/src/chat/chat.api.ts` (publicChatApi 方法)
- BFF 路由：`apps/console/src/app/api/public/` (3 文件)
- Widget 客户端：`apps/widget/src/lib/` (直接调 API)
- Console 客户端：`apps/console/src/lib/chat/api.ts` (调 BFF 代理)
- PG 迁移：`migration/027_pending_lead_attachments.sql`

## API 端点矩阵 (10 个)

### Widget 直接调用（不经过 BFF）
| # | 端点 | 方法 | 调用方 | Rate Limit |
|---|------|------|--------|-----------|
| 1 | /public/widget/config | GET | Widget | — |
| 2 | /public/chat/stream | POST | Widget + Console(BFF) | public.chat.ip |
| 3 | /public/leads | POST | Widget | public.leads.ip |
| 4 | /public/leads/attachments | POST | Widget + Console(BFF) | public.leads.attachments.ip |
| 5 | /public/leads/attachments/:id | GET | Widget + Console(BFF) | — |

### 公开页面（浏览器直接访问）
| # | 端点 | 方法 | 说明 | 状态 |
|---|------|------|------|------|
| 6 | /public/quotes/:token | GET | 公开报价链接 | ✅ (runWithBypassRls) |
| 7 | /public/quotes/:token/confirm | POST | 报价确认 | ✅ |
| 8 | /public/selection-pages/:slug | GET | 公开选型页 | ⏸️ V2 |
| 9 | /public/selection-pages/:slug/submit | POST | 选型提交 | ⏸️ V2 |
| 10 | /public/sales-links/:slug | GET | 获客链接→302 | ✅ (open redirect 防护) |

## BFF 代理 (3 个)

| BFF 路由 | 代理目标 | 使用场景 |
|---------|---------|---------|
| POST /api/public/chat/stream | /public/chat/stream | Console 测试页 (`lib/chat/api.ts` L48) |
| POST /api/public/leads/attachments | /public/leads/attachments | Console 线索附件上传 |
| GET /api/public/leads/attachments/:id | /public/leads/attachments/:id | Console 线索附件下载 |

全部使用 `{ requireAuth: false }` 标记跳过认证（public 端点不需要登录）。

## 安全审查

| 机制 | 端点 | 说明 |
|------|------|------|
| IP 速率限制 | chat/stream, leads, leads/attachments | 每个 IP 独立限流 |
| 参数校验 | widget/config | botId + siteKey + origin 必填 |
| Trusted Origin | chat/stream, leads | 验证 origin 在白名单中 |
| RLS 旁路 + Token/ID 限定 | quotes/:token, selection-pages/:slug | `runWithBypassRls` 确保匿名可访问但按 token 限定 |
| Open Redirect 防护 | sales-links/:slug | `isSafeHttpUrl()` 验证 http/https 协议 |
| 内存安全 | leads/attachments, leads/attachments/:id | Uint8Array 处理文件字节，避免 base64 膨胀 |

## 结论

- **Widget 核心端点 5 个**: 全部实现，含速率限制和安全校验
- **公开页面 5 个**: 3 个 V1 ready（quotes × 2, sales-links），2 个V2（selection-pages）
- **BFF 代理 3 个**: 覆盖 Console 需要的全部 public 端点
- **pending_attachments 表**: migration 027 已实现（曾标记 V2 但实际已完工）
- **角色守卫**: 无——public 端点不需要认证，安全性通过速率限制 + 参数校验 + BypassRLS 保证

**操作**: 无需修改。
