# B-13 Dify knowledge cleaner

## User value

Improve uploaded knowledge quality before embedding so the website assistant can retrieve reliable industrial product information and convert qualified conversations into inquiries.

## Scope

- Add an optional server-side Dify Workflow connector.
- Run Dify after local parsing/chunking and before embedding/Qdrant indexing.
- Preserve workspace isolation in Dify end-user identifiers.
- Fail open to the existing cleaned chunks when Dify is disabled, unavailable, or returns invalid output.
- Document the Dify Workflow input/output contract.

## Out of scope

- Replacing Qdrant, the current embedding provider, or DeepSeek chat.
- Moving customer conversations to Dify.
- Frontend changes or database migrations.
- OCR and table/image extraction.

## Files

- `apps/api/src/dify/**`
- `apps/api/src/documents/document-processor.ts`
- `.env.example`
- `.env.production.http.example`
- `infra/.env.ecs.example`
- `docs/41-dify-cleaning-setup.md`

## Acceptance

- Enabled connector calls `POST /workflows/run` with a server-side API key.
- Valid `cleaned_text` replaces the original chunk while retaining metadata.
- Disabled, timeout, HTTP error, and invalid output paths retain the original chunks.
- Workspace IDs are used only as scoped Dify user identifiers and never mixed.
- API lint, typecheck, and tests pass.
