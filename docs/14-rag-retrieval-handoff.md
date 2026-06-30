# D-03 RAG Retrieval Handoff

## Scope

This iteration adds a service-level backend contract for:

- query embedding
- vector retrieval
- bot-scoped knowledge base filtering
- score threshold fallback
- citation return payload

Branch:

- `feature/D-03-rag-retrieval`

## Current Service Entry

Main constructor:

- `createRagApi()` in `apps/api/src/main.ts`

Primary module:

- `apps/api/src/rag/rag.service.ts`

## Current Flow

1. Resolve bot by `botId`
2. Enforce `workspaceId` isolation
3. Read bot-linked knowledge base IDs
4. Embed the incoming query
5. Search vector store with:
   - `workspaceId`
   - `knowledgeBaseIds`
   - `topK` default `6`
6. Re-rank by:
   - vector similarity `70%`
   - keyword overlap `30%`
7. Keep top citations, default `3`
8. If best score is below threshold `0.55`:
   - return `needsLeadCapture: true`
   - return no citations
9. Otherwise return citations and context blocks

## Current Response Shape

```json
{
  "botId": "bot_xxx",
  "workspaceId": "ws_alpha",
  "query": "What is the motor warranty period?",
  "citations": [
    {
      "chunkId": "chunk_xxx",
      "knowledgeBaseId": "kb_xxx",
      "documentId": "doc_xxx",
      "title": "Warranty Guide",
      "score": 0.81,
      "snippet": "The motor warranty period is 24 months..."
    }
  ],
  "contextBlocks": [
    "[Warranty Guide#chunk_xxx] The motor warranty period is 24 months and includes free parts replacement."
  ],
  "needsLeadCapture": false,
  "retrievalScore": 0.81
}
```

## Test Coverage

Covered cases:

- tenant isolation
- empty knowledge base
- low-score miss
- scoped successful retrieval with citations

## Current Limits

- vector store is in-memory, not real Qdrant yet
- embedding provider is deterministic mock logic, not real model embeddings yet
- no persistence for bots/chunks yet
- no SSE chat binding yet
- no LLM judge model yet; current fallback is threshold-based only

## Next Backend Follow-up

1. Replace `InMemoryQdrantStore` with real Qdrant adapter
2. Replace `SimpleEmbeddingProvider` with real `LLMProvider.embed()`
3. Persist bots and chunks in database
4. Bind retrieval into `POST /public/chat/stream`
5. Add citation persistence to message flow

## Frontend / Integration Note

Cursor does not need to consume this module directly yet.

The next integration point is the widget/public chat stream, where the backend will use this retrieval result to:

- assemble prompt context
- emit citation SSE events
- decide `needsLeadCapture`
