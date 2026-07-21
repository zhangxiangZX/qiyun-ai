# Console ↔ Backend gaps (C-P0-04)

Frontend-only notes for missing or incomplete BFF/API capabilities discovered while closing the V1 acquisition → sales workflow. **Do not treat this file as an API implementation.**

| Method | Path | Body | Expected response | Page / flow |
|--------|------|------|-------------------|-------------|
| `POST` | `/inquiries/batch-assign` | `{ inquiryIds: string[]; ownerId: string; remark?: string }` | `InquiryDetail[]` with `assignRemark` persisted when `remark` provided | 询盘分配 · 批量分配。当前上游仅接收 `inquiryIds` + `ownerId`，备注会被丢弃。Console 已临时改为逐条调用 `POST /inquiries/:id/assign`（含 remark）。 |
| `POST` | `/follow-tasks` | `{ title; dueAt; inquiryId?; customerName?; ownerName?; note?; priority? }` | `201` follow task with `priority` honored | 新建跟进任务。Postgres 路径固定写入 `priority=medium`，忽略前端 note/priority；memory/calendar 路径可带 note。 |
| `PATCH` | `/quote-opportunities/:id` | `{ stage: "won" \| "lost" \| ...; lostReason?: string }` | updated `QuoteDetail` | 报价详情 · 标记成交/丢单。丢单原因字段前端未强制采集；若业务需要必填，请后端返回明确 `VALIDATION_ERROR` 中文 message。 |
| `POST` | `/quote-opportunities` | line-items / tax / freight payload | quote with product rows | 新建报价页产品明细、运费等仅用于本地估算金额；真实落库仍只有 `inquiryId` + `title` + `estimatedAmount`。完整报价明细契约待 Codex 补齐。 |

## Notes

- Console now surfaces API `message` / mapped Chinese copy and no longer swaps real upstream failures into rich mock tables for assign / quotes list / task create.
- Preview (`PREVIEW_MODE` / missing `API_BASE_URL`) still uses empty shells or explicit banners; write actions show Chinese errors instead of fake success.
