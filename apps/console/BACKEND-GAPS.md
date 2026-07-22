# Console ↔ Backend gaps (C-P0-04 / C-P0-05 / C-P0-06)

Current integration status after the Codex backend-gap pass. Items marked `done` are implemented on `feature/codex-backend-gaps`; remaining items are Console integration or production verification work.

| Method | Path | Body | Expected response | Page / flow |
|--------|------|------|-------------------|-------------|
| `done` | `POST /inquiries/batch-assign` | `remark` 已写入每条询盘的 `knownFields.assignRemark`；Console 可切回单次批量请求。 |
| `done` | `POST/PATCH /follow-tasks` | Postgres 已保存 `priority` 与 `note`，迁移见 `038_v1_delivery_backend_gaps.sql`。 |
| `backend done` | `PATCH/POST quote lost` | 后端已强制有效 `lostReason` 并返回中文校验错误；Console 仍需增加原因选择框。 |
| `backend + create UI done` | `POST /quote-opportunities` | `lineItems/taxRate/freightAmount/installationAmount/otherAmount/currency/templateId` 已落库，新建报价已提交；编辑页仍需保存真实行项目。 |

## C-P0-05 · Knowledge

| Method | Path | Body | Expected response | Page / flow |
|--------|------|------|-------------------|-------------|
| `done` | `POST /documents/:id/reparse` | 上游接口已存在并重新入队；队列不可用时仍应展示真实服务错误。 |
| `frontend` | upload byte progress | 字节级进度应由浏览器 XHR/fetch upload 侧统计，不需要新增后端查询接口；当前仍只有阶段进度。 |

## C-P0-05 · Quote send / preview / customer

| Method | Path | Body | Expected response | Page / flow |
|--------|------|------|-------------------|-------------|
| `backend done` | `/quote-opportunities/:id/send` | 已支持自定义 `subject/message/attachmentIds` 和重试；Console 发送面板仍需增加这些字段。 |
| `POST` | `/quote-opportunities/:id/public-token` | — | `{ url, token }` | 客户链接渠道已在预览页调用；Console 将 token 映射为 `/q/:token` 公开页（无需登录 Cookie）。 |
| `POST` | `/public/quotes/:token/confirm` | `{ action? }` | `{ ok, confirmedAt }` | 公开客户页 `/q/:token` 已接通；dashboard 内旧客户页若仍本地 state，以公开页为准。 |
| `backend done` | `GET/POST/DELETE /quote-opportunities/:id/attachments` | Postgres + 对象存储已实现；Console 上传、列表和选择发送附件仍待联调。 |
| `POST` | `/quote-opportunities/:id/documents` | `{ label? }` | QuoteDocumentVersion | 「另存版本」disabled。 |
| `frontend` | `/quote-opportunities/:id/lost` | 详情「标记丢单」需改为原因弹窗并调用专用接口。 |

## C-P0-06 · WeChat / public acquisition source

| Method | Path | Body | Expected response | Page / flow |
|--------|------|------|-------------------|-------------|
| `done` | `/public/selection-pages/:slug/submit` | `wechat_official_account`、销售链接等来源已归一化并写入询盘。 |
| `done` | `/public/sales-links/:slug` | 302 目标地址自动附加 `source=sales_link:{slug}`。 |

## Notes

- Console now surfaces API `message` / mapped Chinese copy and no longer swaps real upstream failures into rich mock tables for assign / quotes list / task create / knowledge upload progress.
- Preview (`PREVIEW_MODE` / missing `API_BASE_URL`) still uses empty shells or explicit banners; write actions show Chinese errors instead of fake success.
- Knowledge test (AI 测试) shows citations when stream API returns them; empty KB / low-score / service error use dedicated outcomes without mock reply fallback.
- C-P0-06 public pages (`/s/:slug`, `/link/:slug`, `/q/:token`, `/success`) do not depend on dashboard login cookies.
- Completed in this pass: lost-reason dialog, quote edit line-item persistence, quote attachment upload/list/delete, custom send subject/body, attachment selection, and batch assignment remark integration.
- Remaining Console cleanup: remove or relabel the legacy dashboard customer-quote page, add byte-level upload progress, and refresh stale browser E2E assertions.
- Test status: API `190 passed / 4 external-service skips`; live platform integration `11/11`; Console unit `112/112`; Console production build `154 routes` succeeded. Legacy browser runner assertions still need updating to current UI semantics.
