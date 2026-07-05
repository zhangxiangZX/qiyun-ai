import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { DashboardWorkspace } from "@/components/dashboard/dashboard-workspace";
import { AUTH_USER_COOKIE, parseAuthUserCookieValue } from "@/server/auth-session";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const user = parseAuthUserCookieValue(cookieStore.get(AUTH_USER_COOKIE)?.value);

  if (user?.platformRole === "platform_admin") {
    redirect("/dashboard/super-admin");
  }

  return <DashboardWorkspace />;
}
