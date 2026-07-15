# Module 17 — File Upload 文件上传审计

**日期**: 2026-07-09 | **结论**: ✅ 已修补（补 GET/DELETE /files/:id BFF 路由）

## 审计范围

- API 路由：`apps/api/src/nest/file-vault/file-vault-route.service.ts` (155 行, 6 端点)
- API 业务层：`apps/api/src/file-vault/file-vault.api.ts` (`FileVaultApi`)
- BFF 路由：`apps/console/src/app/api/files/` (4 文件, 补至 5 文件)
- 前端组件：`document-detail-workspace.tsx`, `document-center-workspace.tsx`

## API 端点矩阵

| # | 端点 | 方法 | BFF (修前) | BFF (修后) | Fallback |
|---|------|------|-----------|-----------|----------|
| 1 | /files | GET | ✅ | ✅ | mock list |
| 2 | /files | POST | ✅ | ✅ | mock create |
| 3 | /files/:id | GET | ❌ | ✅ | 503 |
| 4 | /files/:id | DELETE | ❌ | ✅ | 503 |
| 5 | /files/:id/download | GET | ✅ | ✅ | mock blob |
| 6 | /files/:id/watermark | GET | ✅ | ✅ | mock blob |

## 修补内容

**文件**: `apps/console/src/app/api/files/[id]/route.ts` (新建)

新增 `GET` 和 `DELETE` 处理器，通过 `tryProxy` 代理到 API 服务器：
```
GET  /api/files/:id → proxy → GET  /files/:id (获取文件元数据)
DELETE /api/files/:id → proxy → DELETE /files/:id (删除文件)
```

前端 `document-detail-workspace.tsx` L132/L184 调用这两个端点：
- `useApiResource('/files/${documentId}')` → GET 文件详情
- `apiMutate('/files/${documentId}', 'DELETE')` → 删除文件

## API 端安全特性

- 分类校验：上传时 `category` 必须属于 `VALID_CATEGORIES` (brochure/spec/quote/contract/lead/other)
- 水印支持：`GET /files/:id/watermark` 按用户角色生成水印文件
- 下载头：`Content-Disposition` 附件下载 + UTF-8 文件名编码
- `requestId` 追踪：所有响应头注入 `x-api-request-id`

## BFF Fallback 设计

| BFF 路由 | Mock Fallback |
|---------|---------------|
| GET /files | `listDocumentsMock()` |
| POST /files | `createDocumentMock()` |
| GET /files/:id/download | `getPreviewBlob()` / `buildPlaceholderBlob()` |
| GET /files/:id/watermark | 原始文件 + `x-watermark-mode: preview` |
| GET/DELETE /files/:id | 503（元数据和删除操作需上游 API） |

## 结论

- **6 个 API 端点**: BFF 全覆盖（从 4 补至 5 个路由文件）
- **角色保护**: 所有端点通过 `authContext.resolve` 获取 workspace 上下文，文件操作限定在当前 workspace
- **前端集成**: document-center/detail workspace 使用 `/files/` 端点进行文档管理
- **类型安全**: 新增 BFF 路由通过 TypeScript 编译

**操作**: 已创建 `apps/console/src/app/api/files/[id]/route.ts`，需重新部署。
