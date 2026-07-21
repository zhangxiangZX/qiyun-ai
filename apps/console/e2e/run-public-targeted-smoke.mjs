#!/usr/bin/env node
import { mkdir } from "node:fs/promises";
import path from "node:path";

import { chromium } from "playwright";

const consoleBase = (process.env.CONSOLE_BASE_URL || "http://101.201.63.118").replace(/\/$/, "");
const apiBase = (process.env.API_BASE_URL || `${consoleBase}/backend`).replace(/\/$/, "");
const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;

if (!email || !password) throw new Error("E2E_EMAIL and E2E_PASSWORD are required.");

const login = await fetch(`${apiBase}/auth/login`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ email, password }),
});
if (!login.ok) throw new Error(`API login failed with HTTP ${login.status}.`);
const loginBody = await login.json();
const auth = loginBody.data ?? loginBody;
const hostname = new URL(consoleBase).hostname;
const outputDir = path.resolve("apps/console/e2e/audit-results/public-smoke");
await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true, args: ["--no-proxy-server"] });
const context = await browser.newContext();
await context.addCookies([
  { name: "qiyun_access_token", value: auth.tokens.accessToken, domain: hostname, path: "/", httpOnly: true, sameSite: "Lax" },
  { name: "qiyun_refresh_token", value: auth.tokens.refreshToken, domain: hostname, path: "/", httpOnly: true, sameSite: "Lax" },
  { name: "qiyun_auth_user", value: encodeURIComponent(JSON.stringify(auth.user)), domain: hostname, path: "/", httpOnly: true, sameSite: "Lax" },
]);

const checks = [
  { id: "boss", path: "/dashboard/boss", selectors: ["main", "[class*=card]"] },
  { id: "customers", path: "/dashboard/customers", selectors: ["text=新建客户"] },
  { id: "leads", path: "/dashboard/leads", selectors: ["#lead-search-filter", "text=新建线索"] },
  { id: "enterprise-profile", path: "/dashboard/team/profile", selectors: ["text=企业名称"] },
];
let failed = false;

for (const check of checks) {
  const page = await context.newPage();
  const badResponses = [];
  const pageErrors = [];
  const pendingRequests = new Map();
  page.on("request", (request) => pendingRequests.set(request, request.url()));
  page.on("requestfinished", (request) => pendingRequests.delete(request));
  page.on("requestfailed", (request) => pendingRequests.delete(request));
  page.on("response", (response) => {
    if (response.status() >= 400) badResponses.push(`${response.status()} ${response.url()}`);
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  console.log(`CHECK ${check.id} ${check.path}`);
  try {
    await page.goto(`${consoleBase}${check.path}`, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForTimeout(1_000);
    const results = [];
    for (const selector of check.selectors) {
      const locator = page.locator(selector).first();
      await locator.waitFor({ state: "visible", timeout: 20_000 }).catch(() => undefined);
      results.push({ selector, count: await page.locator(selector).count() });
    }
    const body = (await page.locator("body").innerText()).replace(/\s+/g, " ").slice(0, 600);
    const ok = results.every((result) => result.count > 0) && page.url().includes(check.path);
    failed ||= !ok;
    console.log(JSON.stringify({ ok, finalUrl: page.url(), selectors: results, badResponses, pageErrors, pendingRequests: [...pendingRequests.values()], body }, null, 2));
    await page.screenshot({ path: path.join(outputDir, `${check.id}.png`), fullPage: true, timeout: 5_000 }).catch((error) => {
      console.log(`SCREENSHOT ${check.id} skipped: ${error.message.split("\n")[0]}`);
    });
  } catch (error) {
    failed = true;
    console.log(JSON.stringify({ ok: false, error: String(error), finalUrl: page.url(), badResponses, pageErrors }, null, 2));
  } finally {
    await page.close();
  }
}

await browser.close();
process.exitCode = failed ? 1 : 0;
