# Page Acceptance Runbook

Last updated: 2026-07-05

## Goal

Provide one repeatable page-by-page acceptance flow for:

- local smoke testing
- pre-merge regression
- release-day verification

Base URLs used in recent runs:

- Console: `http://localhost:3010`
- API health: `http://localhost:3001/health`

## Before You Start

1. Confirm Console is reachable.
2. Confirm API health is reachable.
3. Confirm PostgreSQL / Redis / Qdrant / MinIO are healthy in System Status.
4. Use one owner/admin account and one normal member account when possible.

## 1. Public Entry

### `/`

- Page loads without runtime error
- Primary navigation is clickable
- Trial entry is visible
- Login entry is visible

### `/trial`

- Form can be opened and submitted
- Required fields show validation messages
- Success state is visible after submit
- Submission appears later in super-admin review

### `/login`

- Password login works
- Email code login works
- Invalid credentials show a readable error
- “User agreement” opens
- “Privacy policy” opens
- Register entry opens
- Reset password entry opens

### `/register`

- Email registration works
- Phone field, if shown, does not block registration unexpectedly
- Agreement checkbox behavior is clear
- Success or follow-up state is visible

### `/reset-password`

- Request reset code works
- Wrong code is rejected
- New password can be used for login

## 2. Super Admin

### `/dashboard/super-admin`

- Trial request list loads
- Can approve a trial request
- Can reject a trial request
- Approval result is reflected in workspace/customer records
- Review UI is inside super admin, not a detached standalone page

## 3. Dashboard

### `/dashboard`

- KPI cards load
- Charts load
- Empty state is reasonable when data is empty
- Mode banner is truthful in preview/upstream mode
- Date/bot filters behave consistently with backend support

## 4. Knowledge Base

### `/dashboard/knowledge-bases`

- Knowledge base list loads
- Create knowledge base works
- Upload accepts supported files
- Unsupported files are rejected with clear message
- Document statuses move through processing states
- Failed documents show `errorMessage` / `errorCode`
- Single document delete works
- Delete result reflects in list refresh

## 5. Bots

### `/dashboard/bots`

- Bot list loads
- Bot detail loads
- Save/update works in upstream mode
- Knowledge base association shows correctly
- Chat preview panel loads
- Suggested questions show correctly
- Preview/upstream wording is honest

## 6. Conversations

### `/dashboard/conversations`

- Conversation list loads
- Filters work
- Detail panel opens
- Messages render in order
- Status update works
- Tag update works
- High-intent or unresolved markers render correctly

## 7. Leads

### `/dashboard/leads`

- Leads list loads
- Filters work
- Detail sheet opens
- Status update works
- Assignee update works
- Notes update works
- Attachment list renders
- Failed attachment download is blocked with readable message
- Follow-up timeline renders correctly

## 8. Sites / Widget

### `/dashboard/sites`

- Site list loads
- Domain whitelist save works
- Rotate site key works
- Site key is only shown on create/rotate reveal flow
- Install wizard is readable
- Embed snippet is copyable
- Test message works

### Widget install verification

1. Copy widget snippet from Sites page
2. Mount it into a test page
3. Confirm widget loads only on allowed domain
4. Confirm blocked domain is rejected
5. Confirm chat can return citations when KB is ready

## 9. Team / Invitations

### `/dashboard/team`

- Member list loads
- Invitation can be sent
- Invitation resend works
- Invitation revoke works
- Role update respects permission boundaries

## 10. Reports

### `/dashboard/reports`

- Report page loads
- Aggregates render
- Date filter works
- Bot filter works
- Empty state remains stable

## 11. System Status

### `/dashboard/system-status`

- Page loads
- API shows healthy
- PostgreSQL shows healthy
- Redis shows healthy
- Qdrant shows healthy
- Embedding provider shows healthy
- MinIO shows healthy
- Unified `/health` output is displayed without legacy mismatch

## 12. Real Q&A Regression

Use one real knowledge base and verify:

1. Ask a product-parameter question
2. Ask a quote question
3. Ask a lead-time question
4. Ask a customization question
5. Ask an out-of-scope question

Expected:

- in-scope questions cite retrieved material
- quote/delivery/customization questions guide toward lead capture
- out-of-scope question responds honestly instead of hallucinating

## Exit Criteria

Release candidate is ready only if:

1. No runtime crash on key pages
2. No fake-success writes in upstream mode
3. No silent mock fallback in upstream mode
4. Trial -> approval -> workspace usage path works
5. Knowledge upload -> parse -> retrieve -> lead capture path works
