# Workspace Invitations API

Base prefix: `/api/v1`

This note supplements the main API contract and focuses on the invitation flow
used by the console and the future invite landing page.

## Console routes

### `GET /workspace-invitations`

List invitations for the current active workspace.

### `POST /workspace-invitations`

Create or refresh a workspace invitation.

Request:

```json
{
  "email": "new.member@example.com",
  "role": "member"
}
```

Response:

```json
{
  "id": "invite_xxx",
  "workspaceId": "ws_xxx",
  "workspaceName": "Owner Workspace",
  "email": "new.member@example.com",
  "role": "member",
  "status": "pending",
  "token": "wsi_xxx",
  "inviteUrl": "http://localhost:3000/accept-invite?token=wsi_xxx",
  "expiresAt": "2026-07-08T12:00:00.000Z",
  "acceptedAt": null,
  "createdAt": "2026-07-01T12:00:00.000Z",
  "invitedBy": {
    "userId": "user_xxx",
    "name": "Owner",
    "email": "owner@example.com"
  }
}
```

### `POST /workspace-invitations/:id/revoke`

Revoke a pending or revoked invitation.

### `POST /workspace-invitations/:id/resend`

Refresh token, expiry, and invite URL. This also triggers the mail provider.

### `GET /workspace-invitations/:id/delivery-audits`

List invite delivery attempts for troubleshooting.

Response:

```json
[
  {
    "id": "audit_xxx",
    "invitationId": "invite_xxx",
    "recipientEmail": "new.member@example.com",
    "provider": "resend",
    "attempt": 1,
    "status": "failed",
    "startedAt": "2026-07-01T12:00:00.000Z",
    "finishedAt": "2026-07-01T12:00:01.200Z",
    "errorMessage": "Resend invitation email failed: 429 rate limited"
  },
  {
    "id": "audit_yyy",
    "invitationId": "invite_xxx",
    "recipientEmail": "new.member@example.com",
    "provider": "resend",
    "attempt": 2,
    "status": "sent",
    "startedAt": "2026-07-01T12:00:02.000Z",
    "finishedAt": "2026-07-01T12:00:02.420Z",
    "errorMessage": null
  }
]
```

### `POST /workspace-invitations/:id/accept`

Accept an invitation by invitation id after login or registration.

## Invite landing page routes

### `GET /workspace-invitations/token/:token`

Public lookup for the invite landing page.

Response:

```json
{
  "id": "invite_xxx",
  "workspaceId": "ws_xxx",
  "workspaceName": "Owner Workspace",
  "email": "new.member@example.com",
  "role": "member",
  "status": "pending",
  "inviteUrl": "http://localhost:3000/accept-invite?token=wsi_xxx",
  "expiresAt": "2026-07-08T12:00:00.000Z",
  "acceptedAt": null
}
```

Suggested frontend behavior:

1. Open `/accept-invite?token=...`
2. Call `GET /workspace-invitations/token/:token`
3. If not logged in, ask the user to log in or register with the invited email
4. After login, call `POST /workspace-invitations/token/:token/accept`
5. Switch to the invited workspace if needed

### `POST /workspace-invitations/token/:token/accept`

Authenticated direct accept route for the invite landing page.

Headers:

```text
Authorization: Bearer <access-token>
```

Response:

```json
{
  "id": "invite_xxx",
  "workspaceId": "ws_xxx",
  "workspaceName": "Owner Workspace",
  "email": "new.member@example.com",
  "role": "member",
  "status": "accepted",
  "token": "wsi_xxx",
  "inviteUrl": "http://localhost:3000/accept-invite?token=wsi_xxx",
  "expiresAt": "2026-07-08T12:00:00.000Z",
  "acceptedAt": "2026-07-01T12:30:00.000Z",
  "createdAt": "2026-07-01T12:00:00.000Z",
  "invitedBy": {
    "userId": "user_xxx",
    "name": "Owner",
    "email": "owner@example.com"
  }
}
```

## Mail provider settings

Optional environment variables:

```text
EMAIL_PROVIDER=memory|console|resend
EMAIL_FROM=noreply@example.com
EMAIL_REPLY_TO=sales@example.com
RESEND_API_KEY=re_xxx
EMAIL_MAX_ATTEMPTS=3
EMAIL_RETRY_DELAY_MS=150
```

Current providers:

1. `memory`: test/dev outbox
2. `console`: writes invite details to server logs
3. `resend`: sends a real email through the Resend HTTP API
