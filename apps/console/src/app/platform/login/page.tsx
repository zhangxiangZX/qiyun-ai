import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { LoginBrandPanel } from "@/components/auth/login-brand-panel";
import { LoginFooter } from "@/components/auth/login-footer";
import { LoginForm } from "@/components/auth/login-form";
import { resolveLoginRedirectForAuthenticatedUser } from "@/server/auth-navigation";
import { AUTH_USER_COOKIE, parseAuthUserCookieValue } from "@/server/auth-session";
import styles from "@/styles/login.module.css";

export default async function PlatformLoginPage() {
  const cookieStore = await cookies();
  const user = parseAuthUserCookieValue(cookieStore.get(AUTH_USER_COOKIE)?.value);
  const redirectTarget = resolveLoginRedirectForAuthenticatedUser(
    Boolean(user),
    undefined,
    user?.platformRole ?? null,
  );

  if (redirectTarget === "/dashboard/super-admin") {
    redirect(redirectTarget);
  }

  return (
    <section className={styles.shell} aria-label="平台管理员登录">
      <LoginBrandPanel />
      <LoginForm />
      <LoginFooter />
    </section>
  );
}
