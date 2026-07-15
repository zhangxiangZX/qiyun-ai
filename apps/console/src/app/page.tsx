import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { PublicHomeWorkspace } from "@/components/auth/public-home-workspace";
import { resolveLoginRedirectForAuthenticatedUser } from "@/server/auth-navigation";
import { AUTH_USER_COOKIE, parseAuthUserCookieValue } from "@/server/auth-session";

export default async function ConsoleHomePage() {
  const cookieStore = await cookies();
  const user = parseAuthUserCookieValue(cookieStore.get(AUTH_USER_COOKIE)?.value);
  const authenticatedRedirect = resolveLoginRedirectForAuthenticatedUser(Boolean(user), undefined);

  if (authenticatedRedirect) {
    redirect(authenticatedRedirect);
  }

  return (
    <AuthPageShell>
      <PublicHomeWorkspace />
    </AuthPageShell>
  );
}
