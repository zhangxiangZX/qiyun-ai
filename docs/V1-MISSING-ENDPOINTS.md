# V1 后端缺失接口清单（截至 2026-07-09 18:50）

> 对比 `企云AI_V1后端接口与多企业隔离开发文档.docx` 全量端点
> GAP 分析文档中标记"完全缺失"的 5 个模块（sales-links / selection-pages / quick-entry / follow-tasks / audit-logs）
> 均已在模块 05-08/10/16 审计中确认已实现，以下仅列出**真正还没做的**。

---

## 一、确认已实现（GAP 分析误报）

| 原 GAP 标注 | 实际状态 | 审计确认 |
|------------|---------|---------|
| sales-links 8 端点 | ✅ 已实现 | 模块 05 |
| selection-pages 10 端点 | ✅ 已实现 | 模块 06 |
| quick-entry / ai-extract | ✅ 已实现 | 模块 08 |
| follow_tasks 独立实体 | ✅ 已实现（calendar_events 表） | 模块 10 |
| audit_logs | ✅ 已实现（GET /audit-logs + admin 守卫） | 模块 16 |
| public quotes | ✅ 已实现（GET /public/quotes/:token） | 模块 14 |
| public selection-pages | ✅ 已实现 | 模块 14 |
| public sales-links | ✅ 已实现（302 重定向） | 模块 14 |
| quotes: copy/send/deal/lost/void/valid-until | ✅ 全部已实现 | 模块 11 |
| inquiries: batch-assign/intent-level/invalid/lost/convert-to-quote/customer-info | ✅ 全部已实现 | 模块 09 |
| knowledge: reparse/tags/move/chunks/disable-enable | ✅ 全部已实现 | 模块 12 |
| ai-assistants: copy/publish/test-chat/knowledge-bind/enable-disable | ✅ 全部已实现 | 模块 07 |
| sales 数据范围隔离 | ✅ resolveOwnerScope 已实现 | 模块 09 |

---

## 二、真正还缺的接口（7 个）

### P0 — 影响验收

| # | 端点 | 模块 | 说明 | 状态 |
|---|------|------|------|------|
| 1 | `DELETE /sites/:id` | 07-widget-site | 站点删除端点 | ✅ **已修复** — 2026-07-09 |
| 2 | 响应体 envelope 不一致 | 全局 | 规格要求 `{code:0, message:"success", data:{}}`，实际直接展开 body | ⏳ 待决策（破坏性变更） |

### P1 — 功能补齐

| # | 端点 | 模块 | 说明 | 影响 |
|---|------|------|------|------|
| 3 | `POST /auth/logout` | 01-auth-account | JWT 无状态登出（可仅客户端清除） | 低——JWT 设计可接受无服务端登出 |
| 4 | `POST /auth/password/first-change` | 01-auth-account | 首次登录改密 | 低——password-reset 可近似 |
| 5 | `POST /inquiries/:id/files` | 09-inquiry | 询盘文件上传 | 中——leads 已有附件端点 |
| 6 | `GET /quotes/:id/pdf-preview` | 11-quote | 报价 PDF 预览 | 中——V2 可用第三方渲染 |
| 7 | `GET /quotes/:id/pdf-download` | 11-quote | 报价 PDF 下载 | 中——V2 可用第三方渲染 |

### P2 — 增强项

| # | 端点 | 模块 | 说明 |
|---|------|------|------|
| 8 | `GET /analytics/lost-reasons` | 15-analytics | 丢单原因分析 |
| 9 | `POST /reports/export` | 15-analytics | 报表导出 |
| 10 | `GET /reports/:id/download` | 15-analytics | 报表下载 |
| 11 | `GET /sites/:id/check-install` | 07-widget-site | Widget 安装状态检查 |
| 12 | `POST /tenant/files/upload` | 02-tenant-company | Logo/执照专用上传（通用 `/files` 可近似） |
| 13 | `GET /dashboard/:role` | 04-dashboard | 角色分版看板（当前单端点 + query 参数） |

### P3 — 契约对齐

| # | 项 | 说明 |
|---|------|------|
| 14 | `POST /notifications/read-all` | 功能已由 `POST /notifications/read {all:true}` 覆盖，但路径不一致 |

---

## 三、汇总

| 类别 | 数量 | 说明 |
|------|------|------|
| GAP 分析误报（已实现） | 13 项 | 模块 05-08/09-17 审计确认 |
| 真正缺失 P0 | 1 个 | ~~DELETE sites~~ ✅ 已修 → 仅余 envelope 待决策 |
| 真正缺失 P1 | 5 个 | auth logout/first-change + inquiry files + quote pdf ×2 |
| 真正缺失 P2 | 6 个 | analytics 增强项 + dashboard 角色版 + widget check-install |
| 真正缺失 P3 | 1 个 | notifications read-all 路径 |
| **合计真正缺失** | **13 个** | P0 #1 已修复 |

---

## 四、建议优先级

1. **✅ 已修复**: `DELETE /sites/:id` — 7 层全链路实现（interface → inmemory → postgres CTE → service → api → route → BFF）
2. **决策后修**: 响应体 envelope（破坏性变更，需前后端同步）
3. **V2 排期**: PDF 生成、报表导出、analytics 增强
4. **可不修**: logout（JWT 无状态设计）、notifications/read-all（功能已覆盖）
