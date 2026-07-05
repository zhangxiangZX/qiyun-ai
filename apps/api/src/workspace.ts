import type { WorkspaceMemberRole } from "./auth/auth.types";

export const DEFAULT_WORKSPACE_ID =
  process.env.DEFAULT_WORKSPACE_ID ??
  process.env.NEXT_PUBLIC_WORKSPACE_ID ??
  "ws_dev";

export interface RequestContext {
  userId: string;
  workspaceId: string;
  role: WorkspaceMemberRole;
}

export function getWorkspaceId(headers: Headers): string {
  const workspaceId = headers.get("x-workspace-id")?.trim();
  return workspaceId || DEFAULT_WORKSPACE_ID;
}
