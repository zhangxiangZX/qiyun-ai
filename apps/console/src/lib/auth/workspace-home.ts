import type { AuthSession, AuthWorkspaceSummary } from "@/lib/auth/client";

export type WorkspaceRole = AuthWorkspaceSummary["role"];

export const ROLE_HOME_PATHS = {
  owner: "/dashboard/boss",
  admin: "/dashboard/admin",
  member: "/dashboard/sales-rep",
} as const;

export const ROLE_HOME_NAV_IDS = {
  owner: "boss-home",
  admin: "admin-home",
  member: "sales-rep-home",
} as const;

export const ROLE_HOME_PATH_LIST = Object.values(ROLE_HOME_PATHS);

export function resolveWorkspaceHomePath(role?: WorkspaceRole | null): string {
  if (role === "owner") {
    return ROLE_HOME_PATHS.owner;
  }
  if (role === "admin") {
    return ROLE_HOME_PATHS.admin;
  }
  return ROLE_HOME_PATHS.member;
}

export function roleHomeNavIdForRole(role?: WorkspaceRole | null): string {
  if (role === "owner") {
    return ROLE_HOME_NAV_IDS.owner;
  }
  if (role === "admin") {
    return ROLE_HOME_NAV_IDS.admin;
  }
  return ROLE_HOME_NAV_IDS.member;
}

export function isRoleHomePath(pathname: string): boolean {
  return (ROLE_HOME_PATH_LIST as readonly string[]).includes(pathname);
}

/** 当前角色是否允许访问该角色首页路径；非角色首页一律放行。 */
export function canAccessRoleHomePath(
  role: WorkspaceRole | null | undefined,
  pathname: string,
): boolean {
  if (!isRoleHomePath(pathname)) {
    return true;
  }
  return resolveWorkspaceHomePath(role) === pathname;
}

export function resolveActiveWorkspace(
  workspaces: AuthWorkspaceSummary[] | null | undefined,
  activeWorkspaceId?: string | null,
): AuthWorkspaceSummary | null {
  const list = Array.isArray(workspaces) ? workspaces : [];
  return (
    list.find((workspace) => workspace.isActive) ??
    list.find((workspace) => workspace.id === activeWorkspaceId) ??
    list[0] ??
    null
  );
}

export function resolveWorkspaceHomePathFromSession(session: AuthSession | null): string {
  const activeWorkspace = session
    ? resolveActiveWorkspace(session.workspaces, session.user.activeWorkspaceId)
    : null;
  return resolveWorkspaceHomePath(activeWorkspace?.role);
}
