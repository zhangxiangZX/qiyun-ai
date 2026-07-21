#!/usr/bin/env node

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "@playwright/test";

const baseURL = (process.env.CONSOLE_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const maxClicksPerPage = Number(process.env.MAX_CLICKS_PER_PAGE || 3);
const reportSuffix = (process.env.AUDIT_REPORT_SUFFIX || "").replace(/[^a-zA-Z0-9_-]/g, "");
const email = process.env.E2E_EMAIL || "owner@qiyun.ai";
const password = process.env.E2E_PASSWORD || "Qiyun@2026";

const routes = [
  "/dashboard",
  "/dashboard/acceptance",
  "/dashboard/admin",
  "/dashboard/boss",
  "/dashboard/bots",
  "/dashboard/bots/config",
  "/dashboard/bots/landing",
  "/dashboard/bots/landing/edit",
  "/dashboard/bots/landing/mobile",
  "/dashboard/bots/landing/new",
  "/dashboard/calendar",
  "/dashboard/channels",
  "/dashboard/channels/links",
  "/dashboard/channels/links/new",
  "/dashboard/channels/qrcodes",
  "/dashboard/conversations",
  "/dashboard/conversations/test",
  "/dashboard/customers",
  "/dashboard/customers/detail",
  "/dashboard/customers/ops",
  "/dashboard/customers/repurchase",
  "/dashboard/documents",
  "/dashboard/geo",
  "/dashboard/inquiries",
  "/dashboard/inquiries/assign",
  "/dashboard/inquiries/detail",
  "/dashboard/inquiries/new",
  "/dashboard/invitations",
  "/dashboard/knowledge",
  "/dashboard/knowledge-bases",
  "/dashboard/knowledge-bases/upload",
  "/dashboard/leads",
  "/dashboard/logs",
  "/dashboard/modals",
  "/dashboard/quick-entry",
  "/dashboard/quotes",
  "/dashboard/quotes/detail",
  "/dashboard/quotes/new",
  "/dashboard/quotes/templates",
  "/dashboard/quotes/templates/new",
  "/dashboard/reports",
  "/dashboard/reports/bot-insights",
  "/dashboard/reports/channel",
  "/dashboard/reports/export",
  "/dashboard/reports/follow-up",
  "/dashboard/reports/lost-reasons",
  "/dashboard/sales",
  "/dashboard/sales-assistant",
  "/dashboard/sales-rep",
  "/dashboard/settings",
  "/dashboard/settings/account",
  "/dashboard/settings/business-rules",
  "/dashboard/sites",
  "/dashboard/sites/appearance",
  "/dashboard/sites/install",
  "/dashboard/sites/new",
  "/dashboard/sites/settings",
  "/dashboard/success",
  "/dashboard/super-admin",
  "/dashboard/system-status",
  "/dashboard/tasks",
  "/dashboard/tasks/new",
  "/dashboard/tasks/supplement",
  "/dashboard/team",
  "/dashboard/team/billing",
  "/dashboard/team/invite",
  "/dashboard/team/profile",
  "/dashboard/team/profile/edit",
  "/dashboard/team/roles",
  "/dashboard/team/security",
  "/dashboard/tickets",
];
const requestedRoutes = (process.env.AUDIT_ROUTES || "")
  .split(",")
  .map((route) => route.trim())
  .filter(Boolean);
const auditRoutes = requestedRoutes.length ? routes.filter((route) => requestedRoutes.includes(route)) : routes;

const destructivePattern =
  /删除|移除|停用|禁用|作废|成交|丢单|发送|发布|提交|保存|创建|新建|上传|导入|重置|退出|注销|审批|通过|拒绝|撤销|解绑|更换|生成|确认/;
const safeButtonPattern =
  /筛选|刷新|预览|查看|详情|取消|关闭|返回|上一步|下一步|展开|收起|分类|自定义列|帮助|通知|全部|近\s*7\s*天|近\s*30\s*天|日|周|复制|测试|配置|编辑|管理|清除|搜索|切换|更多/;

function cookieDomain() {
  return new URL(baseURL).hostname;
}

async function installAuth(context) {
  const user = encodeURIComponent(
    JSON.stringify({
      id: "user_click_audit",
      email: "click-audit@example.com",
      name: "Click Audit",
      activeWorkspaceId: "ws_dev",
    }),
  );
  await context.addCookies([
    { name: "qiyun_auth_user", value: user, domain: cookieDomain(), path: "/", httpOnly: true, sameSite: "Lax" },
    { name: "qiyun_access_token", value: "click-audit-token", domain: cookieDomain(), path: "/", httpOnly: true, sameSite: "Lax" },
    { name: "qiyun_refresh_token", value: "click-audit-refresh", domain: cookieDomain(), path: "/", httpOnly: true, sameSite: "Lax" },
  ]);
}

async function waitForStablePage(page) {
  await page.waitForLoadState("domcontentloaded");
  await page.locator("main").first().waitFor({ state: "visible", timeout: 20_000 });
  await page.waitForTimeout(350);
}

async function collectCandidates(page) {
  return page.locator('main button, main a[href], main [role="tab"]').evaluateAll(
    (elements, patterns) => {
      const destructive = new RegExp(patterns.destructive);
      const safeButton = new RegExp(patterns.safeButton);
      return elements.flatMap((element, index) => {
        const style = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        const name = (element.getAttribute("aria-label") || element.textContent || "").replace(/\s+/g, " ").trim();
        const href = element instanceof HTMLAnchorElement ? element.getAttribute("href") || "" : "";
        const role = element.getAttribute("role") || element.tagName.toLowerCase();
        const disabled =
          element.hasAttribute("disabled") ||
          element.getAttribute("aria-disabled") === "true" ||
          style.pointerEvents === "none";
        const visible = rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
        const safeLink = href.startsWith("/dashboard") && !href.includes("logout");
        const safeControl = role === "tab" || safeButton.test(name);
        if (!visible || disabled || !name || destructive.test(name) || (!safeLink && !safeControl)) return [];
        const auditId = `click-audit-${index}`;
        element.setAttribute("data-click-audit-id", auditId);
        return [{ auditId, name: name.slice(0, 80), href, role }];
      });
    },
    { destructive: destructivePattern.source, safeButton: safeButtonPattern.source },
  );
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ baseURL, viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
const loginResponse = await context.request.post(`${baseURL}/api/auth/login`, {
  data: { email, password },
});
if (!loginResponse.ok()) {
  console.warn(`Console login returned HTTP ${loginResponse.status()}, using isolated preview cookies.`);
  await installAuth(context);
}

const results = [];

for (const route of auditRoutes) {
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  const result = { route, loaded: false, clicks: [], errors: pageErrors };
  try {
    const response = await page.goto(route, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await waitForStablePage(page);
    const status = response?.status() ?? 200;
    const currentPath = new URL(page.url()).pathname;
    if (status >= 500) throw new Error(`HTTP ${status}`);
    if (currentPath.startsWith("/login")) throw new Error("redirected to login");
    result.loaded = true;

    let candidates;
    try {
      candidates = await collectCandidates(page);
    } catch (error) {
      if (!String(error).includes("Execution context was destroyed")) throw error;
      await page.waitForLoadState("domcontentloaded");
      await waitForStablePage(page);
      candidates = await collectCandidates(page);
    }
    candidates = candidates.slice(0, maxClicksPerPage);
    for (const candidate of candidates) {
      try {
        await page.goto(route, { waitUntil: "domcontentloaded", timeout: 30_000 });
        await waitForStablePage(page);
        const main = page.locator("main").first();
        const control = candidate.href
          ? main.locator(`a[href="${candidate.href}"]`).first()
          : main.getByRole(candidate.role === "tab" ? "tab" : "button", { name: candidate.name, exact: true }).first();
        await control.click({ timeout: 5_000, noWaitAfter: true });
        await page.waitForTimeout(200);
        result.clicks.push({ name: candidate.name, role: candidate.role, ok: true });

        if (await page.locator('[role="dialog"]').count()) {
          await page.keyboard.press("Escape").catch(() => undefined);
        }
      } catch (error) {
        result.clicks.push({ name: candidate.name, role: candidate.role, ok: false, error: String(error) });
      }
    }
  } catch (error) {
    result.errors.push(String(error));
  } finally {
    results.push(result);
    const passedClicks = result.clicks.filter((item) => item.ok).length;
    const failedClicks = result.clicks.length - passedClicks;
    console.log(`${result.loaded && !result.errors.length && !failedClicks ? "PASS" : "FAIL"} ${route} clicks=${passedClicks}/${result.clicks.length}`);
    await page.close();
  }
}

await browser.close();

const failed = results.filter(
  (result) => !result.loaded || result.errors.length || result.clicks.some((item) => !item.ok),
);
const clicked = results.reduce((sum, result) => sum + result.clicks.filter((item) => item.ok).length, 0);
const reportDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "audit-results");
mkdirSync(reportDir, { recursive: true });
writeFileSync(
  path.join(reportDir, `page-click-audit${reportSuffix ? `-${reportSuffix}` : ""}.json`),
  JSON.stringify({ generatedAt: new Date().toISOString(), pages: results.length, clicked, failed: failed.length, results }, null, 2),
);

console.log(`\nPages: ${results.length}, safe clicks: ${clicked}, failed pages: ${failed.length}`);
if (failed.length) process.exitCode = 1;
