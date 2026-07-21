#!/usr/bin/env node
/**
 * Admin homepage interactive audit (/dashboard/admin)
 *
 * Usage (from repo root or apps/console):
 *   pnpm --filter qiyun-console exec playwright test  # not used; run via node:
 *   node apps/console/e2e/run-admin-home-audit.mjs
 *
 * Env:
 *   CONSOLE_BASE_URL (default http://localhost:3000)
 *   API_BASE_URL     (default http://localhost:3001)
 *   E2E_EMAIL / E2E_PASSWORD
 */
import { mkdirSync, writeFileSync } from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "@playwright/test";

const e2eDir = path.dirname(fileURLToPath(import.meta.url));
const consoleBase = (process.env.CONSOLE_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const apiBase = (process.env.API_BASE_URL || "http://localhost:3001").replace(/\/$/, "");
const email = process.env.E2E_EMAIL || "owner@qiyun.ai";
const password = process.env.E2E_PASSWORD || "Qiyun@2026";

const report = { passed: [], failed: [], notes: [] };

function pass(id, detail = "") {
  report.passed.push(detail ? `${id}: ${detail}` : id);
  console.log(`  PASS  ${id}${detail ? ` — ${detail}` : ""}`);
}

function fail(id, detail = "") {
  report.failed.push(detail ? `${id}: ${detail}` : id);
  console.log(`  FAIL  ${id}${detail ? ` — ${detail}` : ""}`);
}

function note(msg) {
  report.notes.push(msg);
  console.log(`  NOTE  ${msg}`);
}

function waitForHttp(url, timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const attempt = () => {
      http
        .get(url, (res) => {
          res.resume();
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 500) resolve(res.statusCode);
          else retry(`HTTP ${res.statusCode}`);
        })
        .on("error", () => retry("connection refused"));
    };
    function retry(reason) {
      if (Date.now() >= deadline) reject(new Error(`${url}: ${reason}`));
      else setTimeout(attempt, 800);
    }
    attempt();
  });
}

async function loginViaApi() {
  const res = await fetch(`${apiBase}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`API login failed: HTTP ${res.status}`);
  const j = await res.json();
  const payload = j.data ?? j;
  const accessToken = payload.tokens?.accessToken ?? payload.accessToken;
  const refreshToken = payload.tokens?.refreshToken ?? payload.refreshToken;
  const user = payload.user;
  if (!accessToken || !user) throw new Error("Login response missing token or user");
  return { accessToken, refreshToken, user };
}

async function injectAuthCookies(context, auth) {
  const hostname = new URL(consoleBase).hostname;
  const userCookieValue = encodeURIComponent(JSON.stringify(auth.user));
  await context.addCookies([
    {
      name: "qiyun_access_token",
      value: auth.accessToken,
      domain: hostname,
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
    {
      name: "qiyun_refresh_token",
      value: auth.refreshToken || auth.accessToken,
      domain: hostname,
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
    {
      name: "qiyun_auth_user",
      value: userCookieValue,
      domain: hostname,
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}

async function installPreviewAuth(context) {
  const hostname = new URL(consoleBase).hostname;
  const user = encodeURIComponent(
    JSON.stringify({
      id: "user_admin_audit",
      email: "admin-audit@example.com",
      name: "Admin Audit",
      activeWorkspaceId: "ws_dev",
    }),
  );
  await context.addCookies([
    { name: "qiyun_auth_user", value: user, domain: hostname, path: "/", httpOnly: true, sameSite: "Lax" },
    { name: "qiyun_access_token", value: "admin-audit-token", domain: hostname, path: "/", httpOnly: true, sameSite: "Lax" },
    { name: "qiyun_refresh_token", value: "admin-audit-refresh", domain: hostname, path: "/", httpOnly: true, sameSite: "Lax" },
  ]);
  note("Using preview/demo cookie auth (API login unavailable).");
}

async function waitForAdminReady(page) {
  await page.waitForLoadState("domcontentloaded");
  await page.locator("main").first().waitFor({ state: "visible", timeout: 25_000 });
  await page.locator('section[aria-label="关键指标"], .kpiGrid, article').first().waitFor({
    state: "visible",
    timeout: 25_000,
  });
  await page.waitForTimeout(600);
}

async function assertNoErrorPage(page, contextLabel) {
  const pathName = new URL(page.url()).pathname;
  if (pathName.startsWith("/login")) throw new Error(`${contextLabel}: redirected to login`);
  const bodyText = ((await page.locator("body").innerText().catch(() => "")) || "").slice(0, 2000);
  if (/Application error|Internal Server Error|Something went wrong|页面不存在|404/.test(bodyText)) {
    throw new Error(`${contextLabel}: error page content detected`);
  }
  const overlayVisible = await page.locator("[data-nextjs-dialog]").first().isVisible().catch(() => false);
  if (overlayVisible) {
    const overlayText = ((await page.locator("[data-nextjs-dialog]").innerText().catch(() => "")) || "").slice(0, 200);
    if (/Error|Unhandled|Runtime/.test(overlayText)) {
      throw new Error(contextLabel + ": Next.js error overlay — " + overlayText);
    }
  }
  const mainVisible = await page.locator("main").first().isVisible().catch(() => false);
  if (!mainVisible) throw new Error(`${contextLabel}: main not visible`);
}

async function openDatePicker(page) {
  const trigger = page.locator('button[aria-haspopup="dialog"]').filter({ hasText: /近\s*[73]0?\s*天|\d{4}-\d{2}-\d{2}/ }).first();
  // Fallback: toolbar first button with calendar
  const btn =
    (await trigger.count()) > 0
      ? trigger
      : page.locator(".toolbar button, [class*='toolbar'] button, button[aria-expanded]").first();
  await btn.click({ timeout: 8_000 });
  await page.locator('[role="dialog"][aria-label="选择日期范围"]').waitFor({ state: "visible", timeout: 8_000 });
  return btn;
}

async function datePickerLabel(page) {
  const trigger = page.locator('button[aria-haspopup="dialog"]').first();
  return ((await trigger.innerText()) || "").replace(/\s+/g, " ").trim();
}

async function run() {
  console.log("Admin home audit");
  console.log(`Console: ${consoleBase}`);
  console.log(`API:     ${apiBase}`);

  try {
    await waitForHttp(consoleBase);
    await waitForHttp(`${apiBase}/health`);
    pass("health.console", consoleBase);
    pass("health.api", `${apiBase}/health`);
  } catch (error) {
    fail("health", String(error));
    writeReport();
    process.exitCode = 1;
    return;
  }

  let authMode = "api";
  let auth = null;
  try {
    auth = await loginViaApi();
    pass("login.api", email);
  } catch (error) {
    note(`API login failed: ${error}`);
    // try console login endpoint like page-click-audit
    try {
      const loginResponse = await fetch(`${consoleBase}/api/auth/login`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!loginResponse.ok) throw new Error(`Console login HTTP ${loginResponse.status}`);
      const j = await loginResponse.json();
      const payload = j.data ?? j;
      auth = {
        accessToken: payload.tokens?.accessToken ?? payload.accessToken,
        refreshToken: payload.tokens?.refreshToken ?? payload.refreshToken,
        user: payload.user,
      };
      if (!auth.accessToken || !auth.user) throw new Error("Console login missing token/user");
      authMode = "console";
      pass("login.console", email);
    } catch (consoleErr) {
      note(`Console login also failed: ${consoleErr}`);
      authMode = "preview";
    }
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    baseURL: consoleBase,
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
  });

  if (authMode === "preview") {
    await installPreviewAuth(context);
  } else {
    await injectAuthCookies(context, auth);
  }

  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (err) => pageErrors.push(err.message));

  try {
    const response = await page.goto("/dashboard/admin", { waitUntil: "domcontentloaded", timeout: 45_000 });
    await waitForAdminReady(page);
    const status = response?.status() ?? 200;
    const pathName = new URL(page.url()).pathname;
    if (status >= 500) throw new Error(`HTTP ${status}`);
    if (pathName.startsWith("/login")) throw new Error("redirected to login after auth");
    pass("nav.admin", pathName);
  } catch (error) {
    fail("nav.admin", String(error));
    note("Cannot reach Admin page — aborting remaining checks.");
    await browser.close();
    writeReport();
    process.exitCode = 1;
    return;
  }


  const ADMIN_PATH = "/dashboard/admin";

  async function goAdmin(page) {
    await page.goto(ADMIN_PATH, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await waitForAdminReady(page);
  }

  async function applyDatePreset(page, presetText) {
    await openDatePicker(page);
    await page.locator('[role="dialog"][aria-label="选择日期范围"] button', { hasText: presetText }).click();
    await page.waitForTimeout(400);
    const dialogStill = await page.locator('[role="dialog"][aria-label="选择日期范围"]').isVisible().catch(() => false);
    if (dialogStill) {
      await page.locator('[role="dialog"] button', { hasText: "确定" }).click().catch(() => undefined);
      await page.waitForTimeout(300);
    }
  }

  async function clickNavLinkAndAssert(page, { id, findLink, expectedPath }) {
    const link = await findLink();
    await link.scrollIntoViewIfNeeded();
    const href = await link.getAttribute("href");
    await Promise.all([
      page.waitForURL((url) => !url.pathname.endsWith(ADMIN_PATH), { timeout: 15_000 }),
      link.click(),
    ]);
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(500);
    await assertNoErrorPage(page, id);
    const pathName = new URL(page.url()).pathname;
    const ok =
      pathName === expectedPath ||
      pathName.startsWith(expectedPath + "/") ||
      pathName.startsWith(expectedPath);
    if (!ok) {
      throw new Error("unexpected path " + pathName + " (href=" + href + ", expected=" + expectedPath + ")");
    }
    pass(id, (href || "") + " → " + pathName);
    await goAdmin(page);
  }

  const isPreviewVisible = await page
    .getByRole("heading", { name: /成员活跃情况/ })
    .isVisible()
    .catch(() => false);
  note("mode hint: preview-only sections visible=" + isPreviewVisible + " (authMode=" + authMode + ")");

  // ---------- DISPLAY ----------
  console.log("\n[DISPLAY]");

  try {
    const label = await datePickerLabel(page);
    const visible = await page.locator('button[aria-haspopup="dialog"]').first().isVisible();
    if (visible && /近|天|\d{4}/.test(label)) pass("display.datePicker", label);
    else fail("display.datePicker", "visible=" + visible + " label=" + label);
  } catch (e) {
    fail("display.datePicker", String(e));
  }

  try {
    const refresh = page.getByRole("button", { name: /刷新/ }).first();
    await refresh.waitFor({ state: "visible", timeout: 8_000 });
    pass("display.refresh");
  } catch (e) {
    fail("display.refresh", String(e));
  }

  try {
    const section = page.locator('section[aria-label="关键指标"]').first();
    await section.waitFor({ state: "visible", timeout: 10_000 });
    const cards = section.locator("article");
    const count = await cards.count();
    const text = await section.innerText();
    const coreLabels = ["待分配询盘", "知识库文档数", "AI助手在线数", "Widget安装站点"];
    const missingCore = coreLabels.filter((l) => !text.includes(l));
    const hasSixth =
      text.includes("有效询盘") ||
      text.includes("高优未分配") ||
      text.includes("选型页访问量") ||
      text.includes("今日待处理异常");
    if (count >= 6 && missingCore.length === 0 && hasSixth) pass("display.kpiCards", count + " cards");
    else fail("display.kpiCards", "count=" + count + " missingCore=" + (missingCore.join(",") || "none") + " hasSixth=" + hasSixth);
  } catch (e) {
    fail("display.kpiCards", String(e));
  }

  try {
    const heading = page.getByRole("heading", { name: /配置进度概览/ });
    await heading.waitFor({ state: "visible", timeout: 10_000 });
    const card = heading.locator("xpath=ancestor::article[1]");
    const rowCount = await card.locator("tbody tr").count();
    const overall = await card.getByText(/总体完成度/).first().isVisible();
    if (rowCount >= 1 && overall) pass("display.configProgress", rowCount + " rows + overall");
    else fail("display.configProgress", "rows=" + rowCount + " overall=" + overall);
  } catch (e) {
    fail("display.configProgress", String(e));
  }

  try {
    const heading = page.getByRole("heading", { name: "待分配询盘列表", exact: true });
    await heading.waitFor({ state: "visible", timeout: 10_000 });
    const card = heading.locator("xpath=ancestor::article[1]");
    const empty = await card.getByText(/暂无待分配询盘/).isVisible().catch(() => false);
    const rows = await card.locator("tbody tr").count();
    if (empty || rows >= 1) pass("display.pendingInquiries", empty ? "empty state" : rows + " rows");
    else fail("display.pendingInquiries", "neither empty state nor rows");
  } catch (e) {
    fail("display.pendingInquiries", String(e));
  }

  try {
    const heading = page.getByRole("heading", { name: "知识库更新状态", exact: true });
    await heading.waitFor({ state: "visible", timeout: 10_000 });
    const card = heading.locator("xpath=ancestor::article[1]");
    const legend = await card.locator("ul li").count();
    const sub = await card.getByText(/总文档数/).isVisible();
    if (legend >= 1 && sub) pass("display.knowledgeStatus", "legend=" + legend);
    else fail("display.knowledgeStatus", "legend=" + legend + " sub=" + sub);
  } catch (e) {
    fail("display.knowledgeStatus", String(e));
  }

  try {
    const heading = page.getByRole("heading", { name: "AI助手运行状态", exact: true });
    await heading.waitFor({ state: "visible", timeout: 10_000 });
    const card = heading.locator("xpath=ancestor::article[1]");
    const ok =
      (await card.getByText(/助手总数|已配置助手/).first().isVisible()) &&
      (await card.locator("ul li").count()) >= 1;
    if (ok) pass("display.aiAssistants");
    else fail("display.aiAssistants", "missing donut/legend/stats");
  } catch (e) {
    fail("display.aiAssistants", String(e));
  }

  try {
    const heading = page.getByRole("heading", { name: "官网Widget与选型页状态", exact: true });
    await heading.waitFor({ state: "visible", timeout: 10_000 });
    const card = heading.locator("xpath=ancestor::article[1]");
    const text = await card.innerText();
    const widget = /官网Widget/.test(text);
    const selection = /选型页/.test(text);
    const details = await card.getByRole("link", { name: /查看详情/ }).count();
    if (widget && selection && details >= 2) pass("display.widgetSelection", "details links=" + details);
    else fail("display.widgetSelection", "widget=" + widget + " selection=" + selection + " details=" + details);
  } catch (e) {
    fail("display.widgetSelection", String(e));
  }

  // ---------- CLICKS ----------
  console.log("\n[CLICKS]");

  try {
    await applyDatePreset(page, "近30天");
    let label = await datePickerLabel(page);
    if (!/近\s*30\s*天/.test(label)) throw new Error('expected 近30天, got "' + label + '"');
    pass("click.datePreset.30d", label);

    await applyDatePreset(page, "近7天");
    label = await datePickerLabel(page);
    if (!/近\s*7\s*天|\d{4}-\d{2}-\d{2}/.test(label)) {
      throw new Error('expected 近7天 or date, got "' + label + '"');
    }
    pass("click.datePreset.7d", label);
  } catch (e) {
    fail("click.datePreset", String(e));
    await page.keyboard.press("Escape").catch(() => undefined);
  }

  try {
    const before = await page.locator('section[aria-label="关键指标"]').innerText();
    await page.getByRole("button", { name: /刷新/ }).first().click();
    await page.waitForTimeout(800);
    await assertNoErrorPage(page, "refresh");
    const afterVisible = await page.locator('section[aria-label="关键指标"]').isVisible();
    const after = await page.locator('section[aria-label="关键指标"]').innerText();
    if (!afterVisible || !/待分配询盘|知识库/.test(after)) throw new Error("KPIs missing after refresh");
    pass("click.refresh", "kpis still visible (textLen " + before.length + "->" + after.length + ")");
  } catch (e) {
    fail("click.refresh", String(e));
  }

  try {
    const heading = page.getByRole("heading", { name: /配置进度概览/ });
    const card = heading.locator("xpath=ancestor::article[1]");
    const links = card.locator("tbody a[href^='/dashboard']");
    const count = await links.count();
    if (count === 0) throw new Error("no config action links");

    const hrefs = [];
    for (let i = 0; i < count; i++) {
      const href = await links.nth(i).getAttribute("href");
      if (href) hrefs.push(href.split("?")[0]);
    }
    const distinct = [...new Set(hrefs)];
    note("config progress hrefs (" + distinct.length + " distinct): " + distinct.join(", "));

    for (let i = 0; i < distinct.length; i++) {
      const targetHref = distinct[i];
      await goAdmin(page);
      const h = page.getByRole("heading", { name: /配置进度概览/ });
      const c = h.locator("xpath=ancestor::article[1]");
      const link = c.locator("tbody a[href='" + targetHref + "']").first();
      const label = ((await link.innerText()) || "").replace(/\s+/g, " ").trim();
      await link.scrollIntoViewIfNeeded();
      await Promise.all([
        page.waitForURL((url) => !url.pathname.endsWith(ADMIN_PATH), { timeout: 15_000 }),
        link.click(),
      ]);
      await page.waitForLoadState("domcontentloaded");
      await page.waitForTimeout(500);
      await assertNoErrorPage(page, "config[" + i + "]");
      const pathName = new URL(page.url()).pathname;
      if (!pathName.startsWith(targetHref) && pathName !== targetHref) {
        note('config "' + label + '" href=' + targetHref + " landed on " + pathName);
      }
      if (!pathName.startsWith("/dashboard")) {
        throw new Error('config "' + label + '" unexpected path ' + pathName);
      }
      pass("click.configAction[" + i + "]", label + " " + targetHref + " → " + pathName);
    }
  } catch (e) {
    fail("click.configActions", String(e));
    await goAdmin(page).catch(() => undefined);
  }

  try {
    await goAdmin(page);
    await clickNavLinkAndAssert(page, {
      id: "click.pendingViewAll",
      expectedPath: "/dashboard/inquiries/assign",
      findLink: async () => {
        const heading = page.getByRole("heading", { name: "待分配询盘列表", exact: true });
        const card = heading.locator("xpath=ancestor::article[1]");
        return card.getByRole("link", { name: /查看全部/ }).first();
      },
    });
  } catch (e) {
    fail("click.pendingViewAll", String(e));
    await goAdmin(page).catch(() => undefined);
  }

  try {
    await goAdmin(page);
    const heading = page.getByRole("heading", { name: "待分配询盘列表", exact: true });
    const card = heading.locator("xpath=ancestor::article[1]");
    const empty = await card.getByText(/暂无待分配询盘/).isVisible().catch(() => false);
    if (empty) {
      note("待分配询盘 empty — no 分配 link to click");
      pass("click.pendingAssign", "skipped (empty list)");
    } else {
      const assignLink = card.locator("tbody a").filter({ hasText: /^分配$/ }).first();
      await assignLink.waitFor({ state: "visible", timeout: 8_000 });
      const href = await assignLink.getAttribute("href");
      await assignLink.scrollIntoViewIfNeeded();
      await Promise.all([
        page.waitForURL((url) => !url.pathname.endsWith(ADMIN_PATH), { timeout: 15_000 }),
        assignLink.click(),
      ]);
      await page.waitForLoadState("domcontentloaded");
      await page.waitForTimeout(500);
      await assertNoErrorPage(page, "pendingAssign");
      const pathName = new URL(page.url()).pathname;
      if (!/\/dashboard\/inquiries(\/|$)/.test(pathName)) {
        throw new Error("unexpected path " + pathName + " (href=" + href + ")");
      }
      pass("click.pendingAssign", href + " → " + pathName);
      await goAdmin(page);
    }
  } catch (e) {
    fail("click.pendingAssign", String(e));
    await goAdmin(page).catch(() => undefined);
  }

  try {
    await clickNavLinkAndAssert(page, {
      id: "click.knowledgeMore",
      expectedPath: "/dashboard/knowledge-bases",
      findLink: async () => {
        const heading = page.getByRole("heading", { name: "知识库更新状态", exact: true });
        const card = heading.locator("xpath=ancestor::article[1]");
        return card.getByRole("link", { name: /查看更多/ }).first();
      },
    });
  } catch (e) {
    fail("click.knowledgeMore", String(e));
    await goAdmin(page).catch(() => undefined);
  }

  try {
    await clickNavLinkAndAssert(page, {
      id: "click.botsMore",
      expectedPath: "/dashboard/bots/config",
      findLink: async () => {
        const heading = page.getByRole("heading", { name: "AI助手运行状态", exact: true });
        const card = heading.locator("xpath=ancestor::article[1]");
        return card.getByRole("link", { name: /查看更多/ }).first();
      },
    });
  } catch (e) {
    fail("click.botsMore", String(e));
    await goAdmin(page).catch(() => undefined);
  }

  try {
    await clickNavLinkAndAssert(page, {
      id: "click.sitesConfig",
      expectedPath: "/dashboard/sites",
      findLink: async () => {
        const heading = page.getByRole("heading", { name: "官网Widget与选型页状态", exact: true });
        const card = heading.locator("xpath=ancestor::article[1]");
        return card.getByRole("link", { name: /配置管理/ }).first();
      },
    });
  } catch (e) {
    fail("click.sitesConfig", String(e));
    await goAdmin(page).catch(() => undefined);
  }

  try {
    await clickNavLinkAndAssert(page, {
      id: "click.widgetDetail",
      expectedPath: "/dashboard/sites",
      findLink: async () => {
        const heading = page.getByRole("heading", { name: "官网Widget与选型页状态", exact: true });
        const card = heading.locator("xpath=ancestor::article[1]");
        return card.locator('a[href="/dashboard/sites"]').filter({ hasText: /查看详情/ }).first();
      },
    });
  } catch (e) {
    fail("click.widgetDetail", String(e));
    await goAdmin(page).catch(() => undefined);
  }

  try {
    await clickNavLinkAndAssert(page, {
      id: "click.selectionDetail",
      expectedPath: "/dashboard/bots/landing",
      findLink: async () => {
        const heading = page.getByRole("heading", { name: "官网Widget与选型页状态", exact: true });
        const card = heading.locator("xpath=ancestor::article[1]");
        return card.locator('a[href="/dashboard/bots/landing"]').filter({ hasText: /查看详情/ }).first();
      },
    });
  } catch (e) {
    fail("click.selectionDetail", String(e));
    await goAdmin(page).catch(() => undefined);
  }

  try {
    await goAdmin(page);
    const memberHeading = page.getByRole("heading", { name: /成员活跃情况/ });
    const memberVisible = await memberHeading.isVisible().catch(() => false);
    if (!memberVisible) {
      note("preview-only sections not visible (upstream mode) — skip 成员活跃 / 系统通知");
      pass("click.previewOnly", "skipped (not visible in upstream mode)");
    } else {
      const memberCard = memberHeading.locator("xpath=ancestor::article[1]");
      const viewAll = memberCard.getByRole("link", { name: /查看全部/ }).first();
      await viewAll.click();
      await page.waitForURL(/\/dashboard\/team/, { timeout: 15_000 });
      await page.waitForLoadState("domcontentloaded");
      await page.waitForTimeout(400);
      await assertNoErrorPage(page, "memberActivity");
      pass("click.memberActivityViewAll", page.url());

      await goAdmin(page);
      const noticeHeading = page.getByRole("heading", { name: "系统通知", exact: true });
      await noticeHeading.waitFor({ state: "visible", timeout: 8_000 });
      const noticeCard = noticeHeading.locator("xpath=ancestor::article[1]");
      const readAll = noticeCard.getByRole("button", { name: /全部标为已读/ }).first();
      await readAll.click();
      await page.waitForTimeout(300);
      await assertNoErrorPage(page, "markAllRead");
      pass("click.markAllRead", "clicked without crash");
    }
  } catch (e) {
    fail("click.previewOnly", String(e));
  }


  if (pageErrors.length) {
    note(`pageerrors: ${pageErrors.slice(0, 5).join(" | ")}`);
  }

  await browser.close();
  writeReport();
  console.log(`\nSummary: ${report.passed.length} passed, ${report.failed.length} failed, ${report.notes.length} notes`);
  if (report.failed.length) process.exitCode = 1;
}

function writeReport() {
  const outDir = path.join(e2eDir, "audit-results");
  mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "admin-home-audit.json");
  writeFileSync(outPath, JSON.stringify(report, null, 2), "utf8");
  console.log(`\nReport: ${outPath}`);
}

run().catch((error) => {
  fail("fatal", String(error));
  writeReport();
  process.exitCode = 1;
});
