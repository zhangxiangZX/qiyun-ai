# Branch Status: feature/C-02-upload

## Current Scope

This branch currently covers:

- `C-01` Knowledge base CRUD contract
- `C-02` Document upload and document status workflow

## Completed

### Backend baseline

- migration for `knowledge_bases` and `documents`
- workspace-aware in-memory repository
- upload queue abstraction
- worker-side document status transition simulator
- local lint, typecheck and test scripts for `apps/api` and `apps/worker`

### Knowledge base contract

- create knowledge base
- list knowledge bases
- get knowledge base detail
- update knowledge base name/status
- soft delete knowledge base
- workspace-scoped unique name validation
- document statistics on knowledge base summary

### Document workflow

- upload documents to a knowledge base
- get document status
- reindex document
- soft-delete documents when parent knowledge base is deleted

## Validation Status

### apps/api

- lint: pass
- typecheck: pass
- test: pass

### apps/worker

- lint: pass
- typecheck: pass
- test: pass

## Frontend Handoff

Cursor should read:

- `docs/12-cursor-handoff-knowledge-base-api.md`

Suggested frontend follow-up:

1. Replace mock knowledge base list with `GET /knowledge-bases`
2. Replace create modal submit with `POST /knowledge-bases`
3. Wire edit panel to `PATCH /knowledge-bases/:id`
4. Wire delete action to `DELETE /knowledge-bases/:id`
5. Wire upload panel to `POST /knowledge-bases/:id/documents`
6. Poll or refresh row state via `GET /documents/:id`

## Known Limits

- not yet wired to real PostgreSQL persistence
- not yet wired to MinIO upload
- not yet wired to queue infra or parser
- not yet wired to Qdrant indexing
- transport is service-contract level and still needs NestJS controller binding

## Commits

- `2416562` `add document upload workflow baseline`
- `5238f7d` `add knowledge base crud contract`

## Push Status

Local commits are ready, but remote push is currently blocked in this environment by GitHub SSH authentication failure:

- `git@github.com: Permission denied (publickey).`
