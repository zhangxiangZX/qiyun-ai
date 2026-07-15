import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { DashboardWorkspace } from "@/components/dashboard/dashboard-workspace";
import { unwrapEnvelope } from "@/lib/api/envelope";
import { resolveActiveWorkspace, resolveWorkspaceHomePath } from "@/lib/auth/workspace-home";
import {
  AUTH_ACCESS_COOKIE,
  AUTH_USER_COOKIE,
  getConsoleAuthApiBaseUrl,
  parseAuthUserCookieValue,
  type ConsoleWorkspaceSummary,
} from "@/server/auth-session";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const user = parseAuthUserCookieValue(cookieStore.get(AUTH_USER_COOKIE)?.value);

  if (user?.platformRole === "platform_admin") {
    redirect("/dashboard/super-admin");
  }

  const accessToken = cookieStore.get(AUTH_ACCESS_COOKIE)?.value;
  if (user && accessToken) {
    try {
      const response = await fetch(`${getConsoleAuthApiBaseUrl()}/workspaces`, {
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      });

      if (response.ok) {
        const workspaces = unwrapEnvelope<ConsoleWorkspaceSummary[]>(await response.json());
        const activeWorkspace = resolveActiveWorkspace(workspaces, user.activeWorkspaceId);
        redirect(resolveWorkspaceHomePath(activeWorkspace?.role));
      }
    } catch {
      // Keep the generic dashboard as a safe fallback when upstream data is unavailable.
    }
  }

  return <DashboardWorkspace />;
}
