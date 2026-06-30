# D-04 Public Chat Stream Handoff

## Scope

This iteration adds a service-level contract for:

- `POST /public/chat/stream`
- site key validation
- origin allowlist validation
- conversation creation / reuse
- user and assistant message persistence in memory
- SSE-style event sequence output

Branch:

- `feature/D-03-rag-retrieval`

## Current Event Sequence

The stream currently emits:

1. `meta`
2. one or more `token`
3. `citations`
4. `done`

Example shape:

```json
[
  {
    "event": "meta",
    "data": { "conversationId": "conv_xxx" }
  },
  {
    "event": "token",
    "data": { "text": "根据" }
  },
  {
    "event": "citations",
    "data": {
      "items": [
        {
          "chunkId": "chunk_xxx",
          "knowledgeBaseId": "kb_xxx",
          "documentId": "doc_xxx",
          "title": "Warranty Guide",
          "score": 0.81,
          "snippet": "The motor warranty period is 24 months..."
        }
      ]
    }
  },
  {
    "event": "done",
    "data": {
      "needsLeadCapture": false,
      "messageId": "msg_xxx"
    }
  }
]
```

## Current Validation Rules

- `siteKey` must exist and be active
- `botId` must exist, belong to the same workspace, and be active
- request `origin` must match at least one allowed domain on the site
- `conversationId`, if provided, must already belong to the same workspace and bot
- `message` must be non-empty

## Current Assistant Reply Behavior

- if RAG returns confident citations:
  - assistant reply is composed from the top citation snippet
- if RAG returns low confidence or no results:
  - assistant reply switches to an information-insufficient fallback
  - `needsLeadCapture` is set to `true`

## Current Limits

- events are returned as structured data, not yet streamed by a real HTTP SSE controller
- no real LLM token streaming yet
- no database persistence yet
- no real site key hashing / rotation yet
- no rate limiting yet
- no lead submission endpoint binding yet

## Test Coverage

Covered cases:

- happy path stream with citations
- low-confidence fallback with `needsLeadCapture`
- origin allowlist rejection

## Next Backend Follow-up

1. Bind this service to a real NestJS SSE endpoint
2. Replace generated assistant reply with real LLM streaming
3. Persist conversations and messages in PostgreSQL
4. Add site key hash storage and key rotation flow
5. Add rate limit checks for public widget traffic
6. Add `POST /public/leads`
