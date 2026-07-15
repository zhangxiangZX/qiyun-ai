import type { BrowserContext } from "@playwright/test";

const AUTH_USER = {
  id: "user_e2e",
  email: "e2e@example.com",
  name: "E2E User",
  activeWorkspaceId: "ws_dev",
};

export async function installAuthCookies(context: BrowserContext, baseURL = "http://localhost:3000") {
  const hostname = new URL(baseURL).hostname;

  await context.addCookies([
    {
      name: "qiyun_auth_user",
      value: encodeURIComponent(JSON.stringify(AUTH_USER)),
      domain: hostname,
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
    {
      name: "qiyun_access_token",
      value: "e2e-access-token",
      domain: hostname,
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
    {
      name: "qiyun_refresh_token",
      value: "e2e-refresh-token",
      domain: hostname,
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}
