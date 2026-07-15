import { unwrapEnvelope } from "@/lib/api/envelope";

export interface InvitationSummary {
  id: string;
  workspaceId: string;
  workspaceName: string;
  email: string;
  role: "admin" | "member" | "viewer";
  status: "pending" | "accepted" | "revoked" | "expired";
  token: string;
  inviteUrl: string;
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
  invitedBy: {
    userId: string;
    name: string;
    email: string;
  };
}

export interface InvitationDeliveryAudit {
  id: string;
  invitationId: string;
  recipientEmail: string;
  provider: string;
  attempt: number;
  status: "sent" | "failed";
  startedAt: string;
  finishedAt: string;
  errorMessage: string | null;
}

async function parseJson<T>(response: Response, fallback: string): Promise<T> {
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { message?: string }
      | null;
    throw new Error(payload?.message || fallback);
  }

  return unwrapEnvelope<T>(await response.json());
}

export async function loadWorkspaceInvitations(): Promise<InvitationSummary[]> {
  const response = await fetch("/api/auth/workspace-invitations", {
    cache: "no-store",
  });
  return parseJson<InvitationSummary[]>(response, "Unable to load invitations.");
}

export async function loadInvitationDeliveryAudits(
  invitationId: string,
): Promise<InvitationDeliveryAudit[]> {
  const response = await fetch(
    `/api/auth/workspace-invitations/${encodeURIComponent(invitationId)}/delivery-audits`,
    {
      cache: "no-store",
    },
  );
  return parseJson<InvitationDeliveryAudit[]>(
    response,
    "Unable to load invite delivery audits.",
  );
}

export async function resendWorkspaceInvitation(
  invitationId: string,
): Promise<InvitationSummary> {
  const response = await fetch(
    `/api/auth/workspace-invitations/${encodeURIComponent(invitationId)}/resend`,
    {
      method: "POST",
    },
  );

  return parseJson<InvitationSummary>(response, "Unable to resend invitation.");
}

export async function revokeWorkspaceInvitation(
  invitationId: string,
): Promise<InvitationSummary> {
  const response = await fetch(
    `/api/auth/workspace-invitations/${encodeURIComponent(invitationId)}/revoke`,
    {
      method: "POST",
    },
  );

  return parseJson<InvitationSummary>(response, "Unable to revoke invitation.");
}
