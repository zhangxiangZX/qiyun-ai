"use client";

import { unwrapEnvelope } from "@/lib/api/envelope";

export interface WorkspaceMemberSummary {
  userId: string;
  email: string;
  name: string;
  role: "owner" | "admin" | "member" | "viewer";
  status: "active" | "disabled";
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

  return unwrapEnvelope<WorkspaceMemberSummary[]>(await response.json());
}

export async function updateWorkspaceMember(
  userId: string,
  patch: { role?: "admin" | "member" | "viewer"; status?: "active" | "disabled" },
): Promise<WorkspaceMemberSummary> {
  const response = await fetch(`/api/auth/workspace-members/${encodeURIComponent(userId)}`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(patch),
  });

  if (!response.ok) {
    throw new Error(await parseMessage(response, "Unable to update workspace member."));
  }

  return unwrapEnvelope<WorkspaceMemberSummary>(await response.json());
}

export async function updateWorkspaceMemberRole(
  userId: string,
  role: "admin" | "member",
): Promise<WorkspaceMemberSummary> {
  return updateWorkspaceMember(userId, { role });
}

export async function removeWorkspaceMember(userId: string): Promise<{ removedUserId: string }> {
  const response = await fetch(`/api/auth/workspace-members/${encodeURIComponent(userId)}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(await parseMessage(response, "Unable to remove workspace member."));
  }

  return unwrapEnvelope<{ removedUserId: string }>(await response.json());
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

  return unwrapEnvelope<TransferOwnershipResult>(await response.json());
}

export async function createWorkspaceInvitation(input: {
  email: string;
  role: "admin" | "member" | "viewer";
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

  return unwrapEnvelope<{
    id: string;
    email: string;
    role: "admin" | "member" | "viewer";
    inviteUrl: string;
    token: string;
    status: string;
  }>(await response.json());
}
