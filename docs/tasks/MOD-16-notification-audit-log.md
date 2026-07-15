# Module 16 — Notification & Audit Log 审计

**日期**: 2026-07-09 | **结论**: ✅ 3/3 端点 BFF 覆盖，无缺口

## 审计范围

- API 路由：`workspace-route.service.ts` (2 个通知端点) + `audit-route.service.ts` (1 个审计端点)
- BFF 路由：`/api/notifications` (2 文件) + `/api/audit-logs` (1 文件)

## API 端点矩阵

| # | 端点 | 方法 | Role Guard | BFF | Fallback |
|---|------|------|------------|-----|----------|
| 1 | /notifications | GET | — | ✅ | `loadNotificationFeed` |
| 2 | /notifications/read | POST | — | ✅ | Cookie 本地 + 上游代理 |
| 3 | /audit-logs | GET | admin | ✅ | 503 |

### 通知端点详情

**GET /notifications** — BFF 用 `loadNotificationFeed()` 做两层 fallback：
- `UPSTREAM_ERROR`: 上游返回错误 → 502
- `UPSTREAM_UNREACHABLE`: 上游不可达 → 503
- 正常: 返回 feed（含 `items[]` + `unreadCount`）

**POST /notifications/read** — 复杂的两层同步：
1. 有 accessToken + upstreamBase → 直接 POST 上游 `/notifications/read` + `Bearer` 认证
2. 上游返回 404/501 → 回退到 BFF cookie 本地已读状态（`mergeReadIds` + `writeNotificationReadCookie`）
3. 完全离线 → 纯 cookie 方案

### 审计端点详情

**GET /audit-logs** — 标准 tryProxy + 503。API 端要求 `assertAdminRole`（owner/admin）。支持 `?module=` / `?targetId=` / `?limit=` / `?offset=` 查询参数。

## 结论

- **BFF 覆盖 100%**: 3/3 端点全部代理
- **通知 BFF 实现最复杂**: 双层 fallback（上游 + cookie 本地），离线模式可用
- **审计角色保护**: `admin` 级别（owner/admin）——更严格

**操作**: 无需修改。
