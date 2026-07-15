# V1 缺失接口修复追踪

> 每次修改前更新本文档：记录改了什么、还剩什么。
> 起始时间：2026-07-09 19:03

---

## 总览

| 级别 | 总数 | 已修 | 剩余 |
|------|------|------|------|
| P0 | 2 | 2 | 0 |
| P1 | 5 | 0 | 5 |
| P2 | 6 | 0 | 6 |
| P3 | 1 | 0 | 1 |
| **合计** | **14** | **2** | **12** |

---

## 已完成

### ✅ P0-1: `DELETE /sites/:id`（2026-07-09 18:55）
- **改了什么**: 7 层全链路 — interface → InMemory → Postgres(CTE) → service → api → route → BFF
- **涉及文件**: chat.repository.ts, chat.postgres-repository.ts, chat.service.ts, chat.api.ts, chat-route.service.ts, sites/[id]/route.ts
- **验证**: TS 双端零错误 + 47/47 测试全绿

### ✅ P0-2: 响应体 envelope（2026-07-09 19:03 — 确认无需修改）
- **结论**: `api-envelope.ts` 已实现 `{ code: 0, message: "success", data: {} }` 格式
- `ok()` / `paginate()` / `fail()` 全部输出标准 envelope
- 所有 route handler 均使用这些函数 — 误报，无需修改

---

## 进行中

### ✅ P1-3: `POST /auth/logout`（2026-07-09 19:05 — 已完成）
- **改了什么**: API 端加 `POST /auth/logout` 路由（返回 `ok({ success: true })`，JWT 无状态无需服务端处理）
- BFF 已有 `auth/logout` 客户端清 cookie 逻辑，无需改 BFF
- **涉及文件**: `apps/api/src/nest/auth/auth-route.service.ts`
- **验证**: TS 零错误 + 56/56 测试全绿

### ✅ P1-4: `POST /auth/password/first-change`（2026-07-09 19:05 — 已完成）
- **改了什么**: API 端加 `POST /auth/password/first-change` 路由 — 校验 `mustChangePassword === true` 后调 `changePassword`；BFF 加代理路由
- 现有 `changePassword` service 已清 `mustChangePassword: false`，只需加路由别名 + 前置检查
- **涉及文件**: `apps/api/src/nest/auth/auth-route.service.ts`, `apps/console/src/app/api/auth/password/first-change/route.ts`
- **验证**: TS 零错误 + 56/56 测试全绿

---

## 进行中

### P1-5: `POST /inquiries/:id/files`（进行中）
- **改什么**: sales route 加文件上传路由 — 校验询盘存在后委托 file-vault 上传，category="lead"
- **涉及**: `sales-route.service.ts` (加路由), `inquiries/[id]/files/route.ts` (加 BFF)
- file-vault 已有 uploadFile() 方法，无需新表或新 repo

### P1 — 功能补齐（5 个）

| # | 端点 | 模块 | 难度 | 说明 |
|---|------|------|------|------|
| 3 | `POST /auth/logout` | 01-auth | 低 | JWT 无状态，返回 ok + 客户端清 token |
| 4 | `POST /auth/password/first-change` | 01-auth | 低 | 检查现有 password-reset 流程 |
| 5 | `POST /inquiries/:id/files` | 09-inquiry | 中 | 复用 file-vault 体系 |
| 6 | `GET /quotes/:id/pdf-preview` | 11-quote | 高 | 需 PDF 生成库，建议 V2 |
| 7 | `GET /quotes/:id/pdf-download` | 11-quote | 高 | 同上 |

### P2 — 增强项（6 个）

| # | 端点 | 模块 | 说明 |
|---|------|------|------|
| 8 | `GET /analytics/lost-reasons` | 15-analytics | 丢单原因聚合 |
| 9 | `POST /reports/export` | 15-analytics | 报表导出 |
| 10 | `GET /reports/:id/download` | 15-analytics | 报表下载 |
| 11 | `GET /sites/:id/check-install` | 07-widget-site | Widget 安装检查 |
| 12 | `POST /tenant/files/upload` | 02-tenant | Logo/执照上传 |
| 13 | `GET /dashboard/:role` | 04-dashboard | 角色分版看板 |

### P3 — 契约对齐（1 个）

| # | 项 | 说明 |
|---|------|------|
| 14 | `POST /notifications/read-all` | 功能已由 `POST /notifications/read {all:true}` 覆盖 |
