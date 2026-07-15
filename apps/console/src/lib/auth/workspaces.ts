"use client";

import { unwrapEnvelope } from "@/lib/api/envelope";
import type { AuthSession, AuthWorkspaceSummary } from "./client";

async function parseMessage(response: Response, fallback: string) {
  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | null;
  return payload?.message || fallback;
}

export async function loadWorkspaces(): Promise<AuthWorkspaceSummary[]> {
  const response = await fetch("/api/auth/workspaces", {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(await parseMessage(response, "Unable to load workspaces."));
  }

  return unwrapEnvelope<AuthWorkspaceSummary[]>(await response.json());
}

export async function activateWorkspace(workspaceId: string): Promise<AuthSession> {
  const response = await fetch(`/api/auth/workspaces/${encodeURIComponent(workspaceId)}/activate`, {
    method: "POST",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(await parseMessage(response, "Unable to switch workspace."));
  }

  return unwrapEnvelope<AuthSession>(await response.json());
}
