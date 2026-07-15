import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { SuperAdminWorkspace } from "@/components/platform/super-admin-workspace";
import { AUTH_USER_COOKIE, parseAuthUserCookieValue } from "@/server/auth-session";

export default async function SuperAdminPage() {
  const cookieStore = await cookies();
  const user = parseAuthUserCookieValue(cookieStore.get(AUTH_USER_COOKIE)?.value);

  if (user?.platformRole !== "platform_admin") {
    redirect("/dashboard");
  }

  return <SuperAdminWorkspace />;
}
