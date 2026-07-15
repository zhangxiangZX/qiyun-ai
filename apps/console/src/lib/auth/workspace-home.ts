import type { AuthSession, AuthWorkspaceSummary } from "@/lib/auth/client";

export type WorkspaceRole = AuthWorkspaceSummary["role"];

export function resolveWorkspaceHomePath(role?: WorkspaceRole | null): string {
  if (role === "owner") {
    return "/dashboard/boss";
  }
  if (role === "admin") {
    return "/dashboard/admin";
  }
  return "/dashboard/sales-rep";
}

export function resolveActiveWorkspace(
  workspaces: AuthWorkspaceSummary[],
  activeWorkspaceId?: string | null,
): AuthWorkspaceSummary | null {
  return (
    workspaces.find((workspace) => workspace.isActive) ??
    workspaces.find((workspace) => workspace.id === activeWorkspaceId) ??
    workspaces[0] ??
    null
  );
}

export function resolveWorkspaceHomePathFromSession(session: AuthSession | null): string {
  const activeWorkspace = session
    ? resolveActiveWorkspace(session.workspaces, session.user.activeWorkspaceId)
    : null;
  return resolveWorkspaceHomePath(activeWorkspace?.role);
}
