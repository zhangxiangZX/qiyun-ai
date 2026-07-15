import type { APIRequestContext, Page } from "@playwright/test";

export const E2E_EMAIL = process.env.E2E_EMAIL ?? "owner@qiyun.ai";
export const E2E_PASSWORD = process.env.E2E_PASSWORD ?? "Qiyun@2026";
export const E2E_ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "";
export const E2E_ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "";
export const E2E_SALES_EMAIL = process.env.E2E_SALES_EMAIL ?? "";
export const E2E_SALES_PASSWORD = process.env.E2E_SALES_PASSWORD ?? "";
export const API_URL = process.env.PLAYWRIGHT_API_URL ?? "http://localhost:3001";

export async function loginViaUi(page: Page, email = E2E_EMAIL, password = E2E_PASSWORD) {
  await page.goto("/login");
  await page.getByRole("heading", { name: "欢迎登录" }).waitFor({ timeout: 20_000 });
  await page.getByPlaceholder("请输入工作邮箱").fill(email);
  await page.getByPlaceholder("请输入登录密码").fill(password);
  const agree = page.locator('label:has-text("用户协议") input[type="checkbox"]');
  if (await agree.count()) await agree.check();
  await page.getByRole("button", { name: "登录", exact: true }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 45_000, waitUntil: "domcontentloaded" });
}

export async function waitForUpstreamMode(page: Page) {
  await page.waitForFunction(async () => {
    const response = await fetch("/api/console/mode", { cache: "no-store" });
    if (!response.ok) return false;
    const payload = await response.json();
    return payload?.mode === "upstream" && payload?.upstreamConfigured === true;
  }, undefined, { timeout: 30_000 });
}

export async function waitForPageReady(page: Page) {
  await page.waitForLoadState("domcontentloaded");
  await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => undefined);
}

export async function apiLogin(
  request: APIRequestContext,
  email = E2E_EMAIL,
  password = E2E_PASSWORD,
) {
  let lastError = "";
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const res = await request.post(`${API_URL}/auth/login`, {
      data: { email, password },
    });
    if (res.status() === 429) {
      lastError = await res.text();
      await new Promise((r) => setTimeout(r, 3000 * (attempt + 1)));
      continue;
    }
    if (!res.ok()) {
      throw new Error(`login failed: ${res.status()} ${await res.text()}`);
    }
    const body = await res.json();
    const data = body.data ?? body;
    const accessToken = data.tokens?.accessToken ?? data.accessToken;
    const workspaceId = data.user?.activeWorkspaceId ?? data.activeWorkspaceId ?? "ws_dev";
    if (!accessToken) throw new Error("login response missing accessToken");
    return { accessToken: String(accessToken), workspaceId: String(workspaceId), raw: data };
  }
  throw new Error(`login rate-limited: ${lastError}`);
}

export function authHeaders(token: string, workspaceId: string) {
  return {
    Authorization: `Bearer ${token}`,
    "x-workspace-id": workspaceId,
  };
}
