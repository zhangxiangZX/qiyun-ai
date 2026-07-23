# Console ↔ Backend gaps (C-P0-04 / C-P0-05 / C-P0-06)

Frontend-only notes for missing or incomplete BFF/API capabilities. **Do not treat this file as an API implementation.**

## Closed (wired)

| Item | Status |
|------|--------|
| `POST /quote-opportunities` + `templateId` | Wired in Console |
| `POST /quote-opportunities/:id/lost` + `lostReason` | Wired with reason picker |
| `POST /follow-tasks` + `priority` | API accepts priority; Console still PATCH as safety net |
| `POST /inquiries/batch-assign` + `remark` | API persists via assignInquiry loop; Console sends remark |
| `POST /public/selection-pages/:slug/submit` + `source` | API maps source → inquiry sourceType/sourceCode |
| `POST /quote-opportunities/:id/send` + `subject`/`body` | Wired in preview + detail send UI |
| `POST /quote-opportunities/:id/documents` | 「另存版本」生成 PDF 快照 |
| Document reparse | BFF proxy; real errors surfaced |
| Report export (memory) | Console client CSV fallback |

## Still open

| Method | Path | Gap |
|--------|------|-----|
| `POST` | `/quote-opportunities` | line-items / tax / freight still local estimate only |
| `POST` | `/quote-opportunities/:id/attachments` | multipart upload still disabled |
| `GET` | upload byte progress | DocumentStatus stages only |
| `GET` | `/reports/exports/:id/download` | memory driver 404 (CSV fallback OK) |

## Notes

- Console surfaces API `message` / Chinese copy; no fake success on write failures.
- Preview mode uses empty shells / banners.
- C-P0-06 public pages do not depend on dashboard cookies.
