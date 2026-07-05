import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ConsoleShell } from "@/components/layout/console-shell";
import { resolveDashboardRedirect } from "@/server/auth-navigation";
import { AUTH_USER_COOKIE, parseAuthUserCookieValue } from "@/server/auth-session";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const user = parseAuthUserCookieValue(cookieStore.get(AUTH_USER_COOKIE)?.value);

  const redirectTarget = resolveDashboardRedirect(Boolean(user), user?.platformRole ?? null);
  if (redirectTarget) {
    redirect(redirectTarget);
  }

  return <ConsoleShell platformRole={user?.platformRole ?? null}>{children}</ConsoleShell>;
}
