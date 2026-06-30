# D-05 HTTP Chat + Leads Handoff

## Scope

This iteration upgrades the previous service contracts into a shared API runtime with HTTP bindings for:

- `POST /public/chat/stream`
- `POST /public/leads`
- `GET /conversations`
- `GET /conversations/:id`

## Runtime Shape

Shared runtime factory:

- `apps/api/src/main.ts`
- `createApiRuntime()`

This keeps:

- documents
- RAG retrieval
- public chat
- conversations
- leads

inside one shared in-memory state graph.

## New HTTP Adapter

File:

- `apps/api/src/http/api.server.ts`

Current transport:

- native Node HTTP server
- JSON request parsing
- SSE text response formatting

This is intentionally lightweight so it can be replaced later by NestJS controllers without changing service logic.

## Routes

### `POST /public/chat/stream`

Request body:

```json
{
  "botId": "bot_xxx",
  "siteKey": "pk_xxx",
  "visitorId": "visitor_1",
  "conversationId": "optional",
  "sdkVersion": "1.0.0",
  "origin": "http://localhost:3000",
  "message": "What is the motor warranty period?"
}
```

Response:

- `text/event-stream`

Events:

- `meta`
- `token`
- `citations`
- `done`

### `POST /public/leads`

Request body:

```json
{
  "botId": "bot_xxx",
  "siteKey": "pk_xxx",
  "conversationId": "conv_xxx",
  "fields": {
    "name": "Zhang",
    "phone": "13800000000"
  }
}
```

Response:

```json
{
  "id": "lead_xxx",
  "workspaceId": "ws_alpha",
  "botId": "bot_xxx",
  "conversationId": "conv_xxx",
  "siteKey": "pk_xxx",
  "fields": {
    "name": "Zhang",
    "phone": "13800000000"
  },
  "createdAt": "2026-06-30T10:00:00.000Z"
}
```

### `GET /conversations`

Required header:

- `X-Workspace-Id`

Response:

- list of conversation summaries

### `GET /conversations/:id`

Required header:

- `X-Workspace-Id`

Response:

- conversation summary
- full messages array

## Current Persistence Level

Persistence is still in-memory, but the model layer is now explicit for:

- conversations
- messages
- leads

This means later database adapters can replace repository implementations without changing route handlers.

## Validation Rules

- `siteKey` must exist and be active
- `botId` must belong to the same workspace and be active
- request `origin` must match allowed domain list
- lead submission requires at least one non-empty field
- conversation lookup requires matching workspace

## Tests Added

- chat happy path
- chat low-confidence fallback
- origin allowlist rejection
- lead submission persistence
- conversation list/detail query
- HTTP integration for SSE + lead submission

## Current Limits

- still not backed by PostgreSQL
- still not backed by real SSE controller decorators
- still not backed by real token-by-token LLM streaming
- `X-Workspace-Id` is temporary for console-side conversation routes
- no auth middleware yet

## Recommended Next Step

1. Replace native HTTP adapter with NestJS controllers
2. Persist conversations/messages/leads in PostgreSQL
3. Add auth and workspace guard
4. Attach real LLM streaming into token events
