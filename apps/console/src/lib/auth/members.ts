"use client";

export interface WorkspaceMemberSummary {
  userId: string;
  email: string;
  name: string;
  role: "owner" | "admin" | "member";
  joinedAt: string;
  isCurrentUser: boolean;
}

export interface TransferOwnershipResult {
  workspace: {
    id: string;
    name: string;
    slug: string;
    role: "owner";
    isActive: boolean;
  };
  previousOwner: WorkspaceMemberSummary;
  newOwner: WorkspaceMemberSummary;
}

async function parseMessage(response: Response, fallback: string) {
  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | null;
  return payload?.message || fallback;
}

export async function loadWorkspaceMembers(): Promise<WorkspaceMemberSummary[]> {
  const response = await fetch("/api/auth/workspace-members", {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(await parseMessage(response, "Unable to load workspace members."));
  }

  return (await response.json()) as WorkspaceMemberSummary[];
}

export async function updateWorkspaceMemberRole(
  userId: string,
  role: "admin" | "member",
): Promise<WorkspaceMemberSummary> {
  const response = await fetch(`/api/auth/workspace-members/${encodeURIComponent(userId)}`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ role }),
  });

  if (!response.ok) {
    throw new Error(await parseMessage(response, "Unable to update member role."));
  }

  return (await response.json()) as WorkspaceMemberSummary;
}

export async function removeWorkspaceMember(userId: string): Promise<{ removedUserId: string }> {
  const response = await fetch(`/api/auth/workspace-members/${encodeURIComponent(userId)}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(await parseMessage(response, "Unable to remove workspace member."));
  }

  return (await response.json()) as { removedUserId: string };
}

export async function transferWorkspaceOwnership(
  workspaceId: string,
  targetUserId: string,
): Promise<TransferOwnershipResult> {
  const response = await fetch(
    `/api/auth/workspaces/${encodeURIComponent(workspaceId)}/transfer-owner`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ targetUserId }),
    },
  );

  if (!response.ok) {
    throw new Error(await parseMessage(response, "Unable to transfer workspace ownership."));
  }

  return (await response.json()) as TransferOwnershipResult;
}

export async function createWorkspaceInvitation(input: {
  email: string;
  role: "admin" | "member";
}) {
  const response = await fetch("/api/auth/workspace-invitations", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(await parseMessage(response, "Unable to send workspace invitation."));
  }

  return (await response.json()) as {
    id: string;
    email: string;
    role: "admin" | "member";
    inviteUrl: string;
    token: string;
    status: string;
  };
}
