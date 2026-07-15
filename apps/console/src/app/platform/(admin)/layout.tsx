import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { resolvePlatformRedirect } from "@/server/auth-navigation";
import { AUTH_USER_COOKIE, parseAuthUserCookieValue } from "@/server/auth-session";

export default async function PlatformAdminLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const user = parseAuthUserCookieValue(cookieStore.get(AUTH_USER_COOKIE)?.value);
  const redirectTarget = resolvePlatformRedirect(Boolean(user), user?.platformRole ?? null);

  if (redirectTarget) {
    redirect(redirectTarget);
  }

  return children;
}
