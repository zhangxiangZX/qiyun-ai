import type { NextRequest } from "next/server";

import { getAuthUser } from "@/server/auth-session";

export const DEFAULT_WORKSPACE_ID =
  process.env.DEFAULT_WORKSPACE_ID ?? process.env.NEXT_PUBLIC_WORKSPACE_ID ?? "ws_dev";

export interface RequestContext {
  workspaceId: string;
}

export function resolveWorkspaceId(
  input: {
    authWorkspaceId?: string | null;
    headerWorkspaceId?: string | null;
  },
): string {
  const authWorkspaceId = input.authWorkspaceId?.trim();
  if (authWorkspaceId) {
    return authWorkspaceId;
  }

  const headerWorkspaceId = input.headerWorkspaceId?.trim();
  if (headerWorkspaceId) {
    return headerWorkspaceId;
  }

  return DEFAULT_WORKSPACE_ID;
}

export function getWorkspaceContext(request: NextRequest): RequestContext {
  const user = getAuthUser(request);

  return {
    workspaceId: resolveWorkspaceId({
      authWorkspaceId: user?.activeWorkspaceId,
      headerWorkspaceId: request.headers.get("x-workspace-id"),
    }),
  };
}
