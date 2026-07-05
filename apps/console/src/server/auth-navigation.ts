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

export function resolveDashboardRedirect(
  isAuthenticated: boolean,
  platformRole?: "platform_admin" | null,
): string | null {
  if (!isAuthenticated) {
    return "/login";
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
