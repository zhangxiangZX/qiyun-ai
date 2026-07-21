# Console ↔ Backend gaps (C-P0-04 / C-P0-05 / C-P0-06)

Frontend-only notes for missing or incomplete BFF/API capabilities. **Do not treat this file as an API implementation.**

## Closed by Codex + wired in Console (2026-07)

| Item | Status |
|------|--------|
| `POST /quote-opportunities` + `templateId` | **Wired.** 新建报价提交所选模板 ID；上游会校验并落库。 |
| `POST /quote-opportunities/:id/lost` + `lostReason` | **Wired.** 报价详情「标记丢单」弹出原因选择，调用 `/lost`（不再仅靠 PATCH stage）。 |
| 跟进任务优先级 | **Console 兜底。** 创建后若 `priority !== medium`，再 `PATCH /follow-tasks/:id`。Postgres `POST` 仍写死 `medium`，建议 Codex 直接读 body.priority。 |
| 文档重新解析 | 已接 BFF；上游未实现时展示真实错误。 |
| 批量分配备注 | Console 仍逐条 `POST /inquiries/:id/assign`（含 remark）；batch-assign 仍忽略 remark。 |

## Still open

| Method | Path | Body | Expected response | Page / flow |
|--------|------|------|-------------------|-------------|
| `POST` | `/inquiries/batch-assign` | `{ inquiryIds; ownerId; remark? }` | 备注落库 | 询盘批量分配。上游仍只收 `inquiryIds` + `ownerId`。 |
| `POST` | `/follow-tasks` | `{ …; priority? }` | `priority` 写入 | Postgres 路径固定 `medium`。 |
| `POST` | `/quote-opportunities` | line-items / tax / freight | 产品明细落库 | 新建页明细仍仅本地估算金额；`estimatedAmount` + `templateId` 已提交。 |
| `POST` | `/quote-opportunities/:id/send` | `{ subject?; body?; attachmentIds? }` | 自定义主题/正文/多附件 | 预览页仍用后端固定 subject/text。 |
| `POST` | `/quote-opportunities/:id/attachments` | multipart | Attachment | 上传按钮保持 disabled。 |
| `POST` | `/quote-opportunities/:id/documents` | `{ label? }` | QuoteDocumentVersion | 「另存版本」disabled。 |
| `POST` | `/public/selection-pages/:slug/submit` | `{ **source**? }` | inquiry `sourceType`/`sourceCode` 来自 source | Console 已传 `source`；上游仍固定 `website` + `selection:{slug}`。 |

## C-P0-05 · Knowledge

| Method | Path | Gap |
|--------|------|-----|
| `GET` | upload byte progress | 无字节级进度；仅 DocumentStatus 阶段。 |

## Report export (memory driver)

| Method | Path | Gap |
|--------|------|-----|
| `GET` | `/reports/exports/:id/download` | memory 驱动 404；Console 已用业务数据前端生成 CSV。 |
| `GET` | `/reports/exports` | memory 空列表；会话内补充。 |
| `POST` | `/reports/exports` | 未接收 `from`/`to` filters。 |

## Notes

- Console surfaces API `message` / Chinese copy; no fake success on write failures.
- Preview mode uses empty shells / banners; write actions show Chinese errors.
- C-P0-06 public pages (`/s/:slug`, `/link/:slug`, `/q/:token`, `/success`) do not depend on dashboard cookies.
