import type { NextRequest } from "next/server";

export interface WorkspaceContext {
  workspaceId: string;
}

export function getWorkspaceContext(request: NextRequest): WorkspaceContext {
  const header = request.headers.get("x-workspace-id");
  const workspaceId = header?.trim() || process.env.NEXT_PUBLIC_WORKSPACE_ID?.trim() || "ws_dev";
  return { workspaceId };
}
