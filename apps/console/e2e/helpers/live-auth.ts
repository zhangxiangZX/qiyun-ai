import type { Page } from "@playwright/test";

const DEFAULT_EMAIL = process.env.E2E_EMAIL ?? "owner@qiyun.ai";
const DEFAULT_PASSWORD = process.env.E2E_PASSWORD ?? "Qiyun@2026";
const UPSTREAM_MODE_LABEL = "真实 API";
const PREVIEW_MODE_LABEL = "演示模式";

export async function loginViaUi(
  page: Page,
  email = DEFAULT_EMAIL,
  password = DEFAULT_PASSWORD,
) {
  await page.goto("/login");
  await page.getByRole("heading", { name: "欢迎登录" }).waitFor({ timeout: 20_000 });
  await page.getByPlaceholder("请输入工作邮箱").fill(email);
  await page.getByPlaceholder("请输入登录密码").fill(password);
  await page.locator('label:has-text("用户协议") input[type="checkbox"]').check();
  await page.getByRole("button", { name: "登录", exact: true }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 45_000, waitUntil: "domcontentloaded" });
}

export async function waitForUpstreamMode(page: Page, timeoutMs = 30_000) {
  await page.waitForFunction(
    async () => {
      const response = await fetch("/api/console/mode", { cache: "no-store" });
      if (!response.ok) return false;
      const payload = await response.json();
      return payload?.mode === "upstream" || payload?.mode === "preview";
    },
    undefined,
    { timeout: timeoutMs },
  );

  const mode = await page.evaluate(async () => {
    const response = await fetch("/api/console/mode", { cache: "no-store" });
    const payload = await response.json();
    return payload?.mode;
  });

  if (mode === "upstream") return "upstream" as const;
  if (mode === "preview") return "preview" as const;
  throw new Error(
    `超时：未检测到「${UPSTREAM_MODE_LABEL}」或「${PREVIEW_MODE_LABEL}」模式`,
  );
}

export async function waitForPageReady(page: Page) {
  await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => undefined);
  await page.waitForTimeout(800);
}
