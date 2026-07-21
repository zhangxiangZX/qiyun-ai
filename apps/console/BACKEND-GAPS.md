# Console ↔ Backend gaps (C-P0-04 / C-P0-05 / C-P0-06)

Frontend-only notes for missing or incomplete BFF/API capabilities discovered while closing the V1 acquisition → sales workflow and knowledge/quotation hardening. **Do not treat this file as an API implementation.**

| Method | Path | Body | Expected response | Page / flow |
|--------|------|------|-------------------|-------------|
| `POST` | `/inquiries/batch-assign` | `{ inquiryIds: string[]; ownerId: string; remark?: string }` | `InquiryDetail[]` with `assignRemark` persisted when `remark` provided | 询盘分配 · 批量分配。当前上游仅接收 `inquiryIds` + `ownerId`，备注会被丢弃。Console 已临时改为逐条调用 `POST /inquiries/:id/assign`（含 remark）。 |
| `POST` | `/follow-tasks` | `{ title; dueAt; inquiryId?; customerName?; ownerName?; note?; priority? }` | `201` follow task with `priority` honored | 新建跟进任务。Postgres 路径固定写入 `priority=medium`，忽略前端 note/priority；memory/calendar 路径可带 note。 |
| `PATCH` | `/quote-opportunities/:id` | `{ stage: "won" \| "lost" \| ...; lostReason?: string }` | updated `QuoteDetail` | 报价详情 · 标记成交/丢单。丢单原因字段前端未强制采集；若业务需要必填，请后端返回明确 `VALIDATION_ERROR` 中文 message。 |
| `POST` | `/quote-opportunities` | line-items / tax / freight / `templateId` payload | quote with product rows + template | 新建报价页产品明细、运费、模板选择仅本地估算；真实落库仍只有 `inquiryId` + `title` + `estimatedAmount`。完整报价明细与 templateId 契约待 Codex 补齐。 |

## C-P0-05 · Knowledge

| Method | Path | Body | Expected response | Page / flow |
|--------|------|------|-------------------|-------------|
| `POST` | `/documents/:id/reparse` | — | updated `KnowledgeDocument` with status back to `uploaded`/`parsing` | 知识库 · 重新解析。Console BFF 已代理；若上游未实现会 503，前端展示真实错误，不假装成功。 |
| `GET` | upload byte progress | — | n/a | 无字节级上传进度接口。Console 仅展示 DocumentStatus 阶段（queued/uploaded/parsing/indexing/ready/failed），不伪造百分比。 |

## C-P0-05 · Quote send / preview / customer

| Method | Path | Body | Expected response | Page / flow |
|--------|------|------|-------------------|-------------|
| `POST` | `/quote-opportunities/:id/send` | `{ recipient?; channel?; subject?; body?; attachmentIds? }` | Delivery log + stage→quoted | 预览页自定义邮件主题/正文/多附件未对接；后端仅固定 subject/text + 单 PDF。 |
| `POST` | `/quote-opportunities/:id/public-token` | — | `{ url, token }` | 客户链接渠道已在预览页调用；Console 将 token 映射为 `/q/:token` 公开页（无需登录 Cookie）。 |
| `POST` | `/public/quotes/:token/confirm` | `{ action? }` | `{ ok, confirmedAt }` | 公开客户页 `/q/:token` 已接通；dashboard 内旧客户页若仍本地 state，以公开页为准。 |
| `GET` | `/quote-opportunities/:id/attachments` | — | Attachment[] | 客户页/预览页附件列表；未提供前 Console 隐藏假下载。 |
| `POST` | `/quote-opportunities/:id/attachments` | multipart | Attachment | 新建/编辑页上传按钮保持 disabled。 |
| `POST` | `/quote-opportunities/:id/documents` | `{ label? }` | QuoteDocumentVersion | 「另存版本」disabled。 |
| `POST` | `/quote-opportunities/:id/lost` | `{ lostReason? }` | Updated quote | 详情「标记丢单」当前走通用 PATCH，无原因采集。 |

## C-P0-06 · WeChat / public acquisition source

| Method | Path | Body | Expected response | Page / flow |
|--------|------|------|-------------------|-------------|
| `POST` | `/public/selection-pages/:slug/submit` | `{ contactName; contactPhone; contactEmail?; answers; attachmentIds?; **source**?: string }` | submission + inquiry with `sourceType`/`sourceCode` from `source` (e.g. `wechat_official_account`) | Console 已传顶层 `source` 与 `answers.source`。当前上游创建询盘固定 `sourceType="website"`、`sourceCode=selection:{slug}`，**忽略** `source`。请 Codex 落库渠道字段。 |
| `GET` | `/public/sales-links/:slug` | query `source` | `302` Location 合并 `source` 到 `targetUrl` | Console BFF 已合并；上游直出时也建议合并，避免丢参。 |

## Notes

- Console now surfaces API `message` / mapped Chinese copy and no longer swaps real upstream failures into rich mock tables for assign / quotes list / task create / knowledge upload progress.
- Preview (`PREVIEW_MODE` / missing `API_BASE_URL`) still uses empty shells or explicit banners; write actions show Chinese errors instead of fake success.
- Knowledge test (AI 测试) shows citations when stream API returns them; empty KB / low-score / service error use dedicated outcomes without mock reply fallback.
- C-P0-06 public pages (`/s/:slug`, `/link/:slug`, `/q/:token`, `/success`) do not depend on dashboard login cookies.
