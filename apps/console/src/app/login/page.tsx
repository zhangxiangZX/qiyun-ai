import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { BRAND_NAME } from "@/lib/brand";
import { LoginBrandPanel } from "@/components/auth/login-brand-panel";
import { LoginFooter } from "@/components/auth/login-footer";
import { LoginForm } from "@/components/auth/login-form";
import { resolveLoginRedirectForAuthenticatedUser } from "@/server/auth-navigation";
import { AUTH_USER_COOKIE, parseAuthUserCookieValue } from "@/server/auth-session";
import styles from "@/styles/login.module.css";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ inviteEmail?: string; inviteToken?: string }>;
}) {
  const params = await searchParams;
  const cookieStore = await cookies();
  const user = parseAuthUserCookieValue(cookieStore.get(AUTH_USER_COOKIE)?.value);

  const redirectTarget = resolveLoginRedirectForAuthenticatedUser(
    Boolean(user),
    params.inviteToken,
  );

  if (redirectTarget) {
    redirect(redirectTarget);
  }

  return (
    <section className={styles.shell} aria-label={`${BRAND_NAME} 登录`}>
      <LoginBrandPanel />
      <LoginForm inviteEmail={params.inviteEmail} inviteToken={params.inviteToken} />
      <LoginFooter />
    </section>
  );
}
