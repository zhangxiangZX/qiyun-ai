# D-06 PostgreSQL Chat Persistence Handoff

## Scope

This iteration adds the first PostgreSQL-oriented persistence layer for:

- conversations
- messages
- leads
- lead fields

## Migration

New migration:

- `migration/002_d05_chat_persistence.sql`

Tables added:

- `conversations`
- `messages`
- `leads`
- `lead_fields`

## Repository Scaffold

New file:

- `apps/api/src/chat/chat.postgres.repository.ts`

This repository is intentionally written against an abstract SQL client:

```ts
interface SqlClient {
  query<T>(sql: string, params: readonly unknown[]): Promise<{ rows: T[] }>;
}
```

That keeps it independent from any specific driver for now:

- `pg`
- Prisma raw SQL
- Drizzle session adapter

all remain possible later.

## What Is Implemented

- create conversation
- find conversation by id
- list conversations by workspace
- create message
- list messages by conversation
- create lead
- persist lead fields into `lead_fields`
- list leads by workspace

## Why This Matters

The runtime still defaults to in-memory repositories, but the database-facing contract is now explicit.

That means the next step is not redesigning chat persistence, only:

1. wiring a real SQL client
2. swapping the runtime from in-memory repository to PostgreSQL repository

## Tests Added

- lead insert + lead_fields insert SQL flow
- conversation list SQL flow

## Current Limits

- repository is not yet wired into `createApiRuntime()`
- `sites` are still in-memory only
- no transaction wrapper yet for multi-step inserts
- no auth or tenancy middleware at DB layer yet

## Recommended Next Step

1. add shared transaction helper for chat persistence
2. add PostgreSQL repository for `sites`
3. switch runtime behind a feature flag or environment variable
