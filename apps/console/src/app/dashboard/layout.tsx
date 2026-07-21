import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ConsoleShell } from "@/components/layout/console-shell";
import { resolveDashboardRedirect } from "@/server/auth-navigation";
import { AUTH_USER_COOKIE, parseAuthUserCookieValue } from "@/server/auth-session";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  // 预览模式（未配置上游 API）用于本地演示与走查，跳过登录守卫直接放行。
  if (!process.env.API_BASE_URL) {
    return <ConsoleShell platformRole={null}>{children}</ConsoleShell>;
  }

  const cookieStore = await cookies();
  const user = parseAuthUserCookieValue(cookieStore.get(AUTH_USER_COOKIE)?.value);

  if (user?.mustChangePassword) {
    redirect(`/reset-password?email=${encodeURIComponent(user.email)}`);
  }

  const redirectTarget = resolveDashboardRedirect(Boolean(user), user?.platformRole ?? null, {
    activeWorkspaceId: user?.activeWorkspaceId ?? null,
  });
  if (redirectTarget) {
    redirect(redirectTarget);
  }

  return <ConsoleShell platformRole={user?.platformRole ?? null}>{children}</ConsoleShell>;
}
