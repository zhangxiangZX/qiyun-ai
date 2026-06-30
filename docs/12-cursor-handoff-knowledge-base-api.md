# Cursor Handoff: Knowledge Base API

## Scope

This handoff covers the backend contract for:

- `C-01` Knowledge base CRUD
- `C-02` Document upload and status flow

Frontend owner: Cursor  
Backend branch: `feature/C-02-upload`

## Workspace Rule

Every request must be scoped to the current workspace.

- Source of truth: authenticated workspace context
- Current temporary shape in backend examples:

```ts
type RequestContext = {
  workspaceId: string;
};
```

Do not send cross-workspace IDs from the UI. Treat `404` as both:

- resource does not exist
- resource exists but is outside the active workspace

## Endpoints

### 1. List knowledge bases

`GET /knowledge-bases`

Response:

```json
[
  {
    "id": "kb_123",
    "workspaceId": "ws_alpha",
    "name": "Product Docs",
    "status": "active",
    "documentCount": 2,
    "readyDocumentCount": 1,
    "failedDocumentCount": 0,
    "createdAt": "2026-06-30T09:00:00.000Z",
    "updatedAt": "2026-06-30T09:10:00.000Z"
  }
]
```

### 2. Create knowledge base

`POST /knowledge-bases`

Request:

```json
{
  "name": "Product Docs"
}
```

Validation:

- name is required
- name must be unique inside the workspace

### 3. Get knowledge base detail

`GET /knowledge-bases/:id`

Response shape matches list item.

### 4. Update knowledge base

`PATCH /knowledge-bases/:id`

Request:

```json
{
  "name": "Updated Docs",
  "status": "disabled"
}
```

Notes:

- `name` is optional
- `status` is optional
- valid status values: `active`, `disabled`

### 5. Delete knowledge base

`DELETE /knowledge-bases/:id`

Soft delete only.

Response:

```json
{
  "id": "kb_123",
  "deletedAt": "2026-06-30T09:30:00.000Z",
  "documentCount": 3
}
```

Notes:

- deleting a knowledge base soft-deletes its documents too
- deleted records should disappear from list views

### 6. Upload documents

`POST /knowledge-bases/:id/documents`

Request:

```json
[
  {
    "fileName": "faq.pdf",
    "fileType": "application/pdf",
    "sizeBytes": 1024
  }
]
```

Response:

```json
[
  {
    "id": "doc_123",
    "workspaceId": "ws_alpha",
    "knowledgeBaseId": "kb_123",
    "fileName": "faq.pdf",
    "fileType": "application/pdf",
    "storageKey": "ws_alpha/kb_123/uuid-faq.pdf",
    "sizeBytes": 1024,
    "status": "uploaded",
    "chunkCount": null,
    "errorMessage": null,
    "createdAt": "2026-06-30T09:31:00.000Z",
    "updatedAt": "2026-06-30T09:31:00.000Z",
    "deletedAt": null
  }
]
```

### 7. Get document

`GET /documents/:id`

### 8. Reindex document

`POST /documents/:id/reindex`

Reindex resets:

- `status -> uploaded`
- `chunkCount -> null`
- `errorMessage -> null`

## Document Status Flow

The current worker transition is:

`uploaded -> parsing -> indexing -> ready`

Failure case:

`uploaded -> parsing -> indexing -> failed`

Suggested UI labels:

- `uploaded`: queued
- `parsing`: parsing
- `indexing`: indexing
- `ready`: ready
- `failed`: failed

## Error Handling

Backend error mapping:

- `400 VALIDATION_ERROR`
- `404 NOT_FOUND`
- `500 INTERNAL_ERROR`

Frontend guidance:

- show inline form error for `VALIDATION_ERROR`
- show empty/not found state for `404`
- show retry toast or panel error for `500`

## UI Mapping Guidance

For knowledge base cards/table rows, map:

- title: `name`
- status badge: `status`
- total documents: `documentCount`
- ready documents: `readyDocumentCount`
- failed documents: `failedDocumentCount`
- last updated: `updatedAt`

For upload table rows, map:

- file name: `fileName`
- status: `status`
- size: `sizeBytes`
- chunk info: `chunkCount`
- error text: `errorMessage`

## Current Limits

- current implementation is service-level and in-memory
- object storage, parser, queue and database adapters are not wired yet
- response shapes are stable enough for UI integration, but transport layer may still be wrapped later by NestJS controllers
