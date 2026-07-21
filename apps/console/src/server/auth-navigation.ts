export function resolveLoginRedirectForAuthenticatedUser(
  isAuthenticated: boolean,
  inviteToken?: string,
  platformRole?: "platform_admin" | null,
): string | null {
  if (!isAuthenticated) {
    return null;
  }

  if (inviteToken) {
    return `/accept-invite?token=${encodeURIComponent(inviteToken)}`;
  }

  if (platformRole === "platform_admin") {
    return "/dashboard/super-admin";
  }

  return "/dashboard";
}

/** 平台管理员在无企业空间时允许停留的控制台路径 */
export const PLATFORM_ADMIN_ALLOWED_PREFIXES = [
  "/dashboard/super-admin",
  "/dashboard/system-status",
] as const;

export function isPlatformAdminAllowedDashboardPath(pathname: string): boolean {
  return PLATFORM_ADMIN_ALLOWED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export type DashboardRedirectOptions = {
  pathname?: string;
  /** Cookie 中的 activeWorkspaceId；空则视为无普通企业空间 */
  activeWorkspaceId?: string | null;
};

/**
 * Dashboard 路由守卫目标。
 * - 未登录 → /login
 * - platform_admin 且无企业空间，访问非平台页 → /dashboard/super-admin
 */
export function resolveDashboardRedirect(
  isAuthenticated: boolean,
  platformRole?: "platform_admin" | null,
  options?: DashboardRedirectOptions,
): string | null {
  if (!isAuthenticated) {
    return "/login";
  }

  const pathname = options?.pathname;
  const hasWorkspace = Boolean(options?.activeWorkspaceId?.trim());

  if (
    platformRole === "platform_admin" &&
    !hasWorkspace &&
    pathname &&
    !isPlatformAdminAllowedDashboardPath(pathname)
  ) {
    return "/dashboard/super-admin";
  }

  return null;
}

export function resolvePlatformRedirect(
  isAuthenticated: boolean,
  platformRole?: "platform_admin" | null,
): string | null {
  if (!isAuthenticated) {
    return "/platform/login";
  }

  if (platformRole !== "platform_admin") {
    return "/dashboard";
  }

  return "/dashboard/super-admin";
}
