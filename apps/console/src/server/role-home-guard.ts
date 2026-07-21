import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { unwrapEnvelope } from "@/lib/api/envelope";
import {
  canAccessRoleHomePath,
  resolveActiveWorkspace,
  resolveWorkspaceHomePath,
  type WorkspaceRole,
} from "@/lib/auth/workspace-home";
import {
  AUTH_ACCESS_COOKIE,
  AUTH_USER_COOKIE,
  getConsoleAuthApiBaseUrl,
  parseAuthUserCookieValue,
  type ConsoleWorkspaceSummary,
} from "@/server/auth-session";

/**
 * 服务端拦截：禁止访问非当前角色的首页。
 * 预览模式（未配置 API_BASE_URL）放行，便于本地走查。
 */
export async function enforceRoleHomeAccess(requestedPath: string): Promise<void> {
  if (!process.env.API_BASE_URL) {
    return;
  }

  const cookieStore = await cookies();
  const user = parseAuthUserCookieValue(cookieStore.get(AUTH_USER_COOKIE)?.value);
  const accessToken = cookieStore.get(AUTH_ACCESS_COOKIE)?.value;

  if (!user || !accessToken) {
    redirect("/login");
  }

  // 平台超管不进企业角色首页业务；若误入则回超管台
  if (user.platformRole === "platform_admin") {
    redirect("/dashboard/super-admin");
  }

  let role: WorkspaceRole | null = null;

  try {
    const response = await fetch(`${getConsoleAuthApiBaseUrl()}/workspaces`, {
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    });

    if (response.ok) {
      const workspaces = unwrapEnvelope<ConsoleWorkspaceSummary[]>(await response.json());
      role = resolveActiveWorkspace(workspaces, user.activeWorkspaceId)?.role ?? null;
    }
  } catch {
    // 上游不可用时不硬拦，避免误伤；落到正确首页由客户端会话补齐
    return;
  }

  if (!canAccessRoleHomePath(role, requestedPath)) {
    redirect(resolveWorkspaceHomePath(role));
  }
}
