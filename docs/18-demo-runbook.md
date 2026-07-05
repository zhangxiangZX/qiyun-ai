# Demo Runbook

## Goal

Give the team a repeatable way to verify the seeded Qiyun AI MVP experience before a walkthrough, screen recording, or customer demo.

## Recommended Mode

Use one of these two modes:

1. Preview mode
   - Best for local demo without a fully connected upstream stack
   - Uses built-in demo data and simulated writes

2. Upstream mode
   - Best for end-to-end acceptance with real API services
   - Requires login and working infrastructure

## What Is Seeded Today

The current preview / seeded experience includes:

- Knowledge bases
  - `Product Handbook`
  - `Pricing Notes`

- Bots
  - `Website Support`
  - `Sales Advisor`
  - `Internal Copilot`

- Sites
  - Preview sites for each seeded bot
  - Local allowlist entries for `localhost` and `127.0.0.1`

- Conversations and leads
  - At least one seeded support conversation
  - At least one seeded lead for the support bot

## Fast Check

Run:

```powershell
powershell -ExecutionPolicy Bypass -File E:\qiyun-ai\scripts\run-demo-acceptance.ps1
```

This script checks:

- API health endpoint
- Console mode endpoint
- Login page reachability
- Dashboard reachability
- Dashboard API reachability
- Sites API reachability
- System status page reachability

## Demo Path

Use this order for a live walkthrough:

1. `/login`
   - Explain preview vs upstream mode

2. `/dashboard`
   - Show KPI cards, trend chart, recent leads

3. `/dashboard/knowledge-bases`
   - Show seeded knowledge bases and document states

4. `/dashboard/bots`
   - Show bot editing, recommended questions, and chat preview

5. `/dashboard/leads`
   - Show lead status flow, attachments, and follow-up timeline

6. `/dashboard/sites`
   - Show install wizard, white-list save flow, and widget integration checks

7. `/dashboard/system-status`
   - Show service health, vector store, object storage, and embedding status

## Acceptance Notes

- Preview mode is honest by design
  - Writes affect demo data only
  - It should never be presented as production persistence

- Upstream mode should be used when validating:
  - real site-key rotation
  - real white-list patching
  - real document upload
  - real notifications
  - real chat / lead APIs

## If Something Fails

Check these first:

1. `http://localhost:3001/health`
2. `http://localhost:3000/api/console/mode`
3. current `API_BASE_URL` / `NEXT_PUBLIC_API_BASE_URL`
4. current auth session / workspace selection
5. local Docker services for Postgres / Redis / Qdrant / MinIO
