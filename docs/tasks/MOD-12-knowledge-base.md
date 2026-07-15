# Module 12 — Knowledge Base 知识库审计

**日期**: 2026-07-09 | **结论**: ✅ 核心功能完整，dead-letter 队列缺少 BFF（V2 运维工具）

## 审计范围

- API 路由：`apps/api/src/nest/documents/documents-route.service.ts` (18 个端点, 161 行)
- API 业务层：`apps/api/src/documents/document.api.ts` (17 个方法, 185 行)
- BFF 路由：`apps/console/src/app/api/knowledge-bases/` (3 文件) + `apps/console/src/app/api/documents/` (6 文件)
- Console 本地层：`apps/console/src/server/documents/document.api.ts` (9 个方法)
- 前端页面：`/dashboard/knowledge-bases`, `/dashboard/knowledge` (knowledge-base-workspace 纯 mock)
- PG 表：`knowledge_bases` (暂存于 snapshot 迁移，非独立 migration)

## API 端点矩阵 (18 个)

### KB CRUD (7 端点)
| # | 端点 | 方法 | Role Guard | BFF | Local Fallback | 前端调用 |
|---|------|------|------------|-----|----------------|---------|
| 1 | /knowledge-bases | GET | all | ✅ | ✅ local | ❌ (mock) |
| 2 | /knowledge-bases | POST | manager | ✅ | ✅ local | ❌ |
| 3 | /knowledge-bases/:id | GET | all | ✅ | ✅ local | ❌ |
| 4 | /knowledge-bases/:id | PATCH | manager | ✅ | ✅ local | ❌ |
| 5 | /knowledge-bases/:id | DELETE | manager | ✅ | ✅ local | ❌ |
| 6 | /knowledge-bases/:id/documents | GET | all | ✅ | ✅ local | ❌ |
| 7 | /knowledge-bases/:id/documents | POST | manager | ✅ | ✅ local | ❌ |

> 注：knowledge-base-workspace.tsx 使用硬编码 mock 数据，不调 API。BFF 全部有 local fallback。

### Document CRUD (2 端点)
| # | 端点 | 方法 | Role Guard | BFF | Local Fallback |
|---|------|------|------------|-----|----------------|
| 8 | /documents/:id | GET | all | ✅ | ✅ local |
| 9 | /documents/:id | DELETE | manager | ✅ | ⚠️ 503（需上游） |

> `document-delete-action.tsx` L85: `apiMutate('/documents/${document.id}', 'DELETE')` — BFF 代理层完整，preview 模式不可用符合预期。

### Document 高级操作 (5 端点)
| # | 端点 | 方法 | Role Guard | BFF | Local Fallback |
|---|------|------|------------|-----|----------------|
| 10 | /documents/:id/reindex | POST | manager | ✅ | ✅ local |
| 11 | /documents/:id/reparse | POST | manager | ✅ | ⚠️ 503 |
| 12 | /documents/:id/tags | PATCH | manager | ✅ | ⚠️ 503 |
| 13 | /documents/:id/move | POST | manager | ✅ | ⚠️ 503 |
| 14 | /documents/:id/chunks | GET | all | ✅ | ⚠️ 503 |

### Dead-Letter 队列 (4 端点) — ⚠️ 缺少 BFF
| # | 端点 | 方法 | Role Guard | BFF |
|---|------|------|------------|-----|
| 15 | /document-jobs/dead-letter | GET | all | ❌ |
| 16 | /document-jobs/dead-letter/:jobId | GET | all | ❌ |
| 17 | /document-jobs/dead-letter/:jobId/retry | POST | manager | ❌ |
| 18 | /document-jobs/dead-letter/:jobId | DELETE | manager | ❌ |

> Console 前端 `grep dead-letter` 零结果。这些是后台运维工具端点，用于查看/重试/关闭文档处理失败队列。V2 可考虑在 Console 管理面板中添加。

## 架构特点

### 双重运行模式
BFF 路由采用了独特的两层 fallback 模式（不同于 sales 模块的纯 proxy）：
```
tryProxy(request, ...) → 成功则返回上游响应
                       → 失败则调用本地 documentApi (InMemory fallback)
                       → 不可本地化的操作返回 503
```

### 角色保护
知识库模块**全部写操作使用 `assertManagerRole`**（owner/admin），比 quote/inquiry 的 `assertWriteRole`（含 member）更严格。符合预期：知识库内容直接影响 AI 回答质量，应限制为管理员操作。

### PG 持久化
`knowledge_bases` 表通过 `snapshot-store.ts` 的完整 schema dump 方式持久化，而非独立 migration。这是架构上的不一致——其他模块都有独立 migration（如 migration/022_sales_conversion_v2.sql）。V2 应提取为独立 migration。

## 结论

- **核心功能完整**: 14/14 用户端点有 BFF 代理，local fallback 覆盖 KB CRUD + 文档基本操作
- **死信队列 0/4 BFF**: 纯后台运维端点，V1 前端不使用，不计入 V1 缺口
- **知识库前端页面**: 当前使用硬编码 mock 数据，V2 应接入 API
- **PG 迁移**: 需独立化 `knowledge_bases` migration（V2 改进项）

**操作**: 无需修改。
