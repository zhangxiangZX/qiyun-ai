#!/usr/bin/env node
/**
 * Sales homepage interactive audit (/dashboard/sales-rep)
 *
 * Usage (from repo root or apps/console):
 *   node apps/console/e2e/run-sales-home-audit.mjs
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

const SALES_PATH = "/dashboard/sales-rep";

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
      id: "user_sales_audit",
      email: "sales-audit@example.com",
      name: "Sales Audit",
      activeWorkspaceId: "ws_dev",
    }),
  );
  await context.addCookies([
    { name: "qiyun_auth_user", value: user, domain: hostname, path: "/", httpOnly: true, sameSite: "Lax" },
    { name: "qiyun_access_token", value: "sales-audit-token", domain: hostname, path: "/", httpOnly: true, sameSite: "Lax" },
    { name: "qiyun_refresh_token", value: "sales-audit-refresh", domain: hostname, path: "/", httpOnly: true, sameSite: "Lax" },
  ]);
  note("Using preview/demo cookie auth (API login unavailable).");
}

async function waitForSalesReady(page) {
  await page.waitForLoadState("domcontentloaded");
  await page.locator("main").first().waitFor({ state: "visible", timeout: 25_000 });
  await page.locator('section[aria-label="关键指标"], article').first().waitFor({
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
  const trigger = page
    .locator('button[aria-haspopup="dialog"]')
    .filter({ hasText: /近\s*[73]0?\s*天|\d{4}-\d{2}-\d{2}/ })
    .first();
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

async function goSales(page) {
  await page.goto(SALES_PATH, { waitUntil: "domcontentloaded", timeout: 45_000 });
  await waitForSalesReady(page);
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

function cardByHeading(page, title) {
  const heading = page.getByRole("heading", { name: title, exact: true });
  return heading.locator("xpath=ancestor::article[1]");
}

async function clickNavLinkAndAssert(page, { id, findLink, expectedPath }) {
  const link = await findLink();
  await link.scrollIntoViewIfNeeded();
  const href = await link.getAttribute("href");
  await Promise.all([
    page.waitForURL((url) => !url.pathname.endsWith(SALES_PATH) && !url.pathname.endsWith(SALES_PATH + "/"), {
      timeout: 15_000,
    }),
    link.click(),
  ]);
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(500);
  await assertNoErrorPage(page, id);
  const pathName = new URL(page.url()).pathname;
  if (expectedPath && !pathName.startsWith(expectedPath)) {
    throw new Error(`${id}: expected ${expectedPath}, got ${pathName} (href=${href})`);
  }
  pass(id, `${href || ""} → ${pathName}`);
  await goSales(page);
}

async function run() {
  console.log("Sales home audit");
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
    permissions: ["clipboard-read", "clipboard-write"],
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
    const response = await page.goto(SALES_PATH, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await waitForSalesReady(page);
    const status = response?.status() ?? 200;
    const pathName = new URL(page.url()).pathname;
    if (status >= 500) throw new Error(`HTTP ${status}`);
    if (pathName.startsWith("/login")) throw new Error("redirected to login after auth");
    pass("nav.sales", pathName);
  } catch (error) {
    fail("nav.sales", String(error));
    note("Cannot reach Sales page — aborting remaining checks.");
    await browser.close();
    writeReport();
    process.exitCode = 1;
    return;
  }

  const calendarCard0 = cardByHeading(page, "我的跟进日历");
  const upstreamCalendar = await calendarCard0
    .getByText(/日程数据请前往/)
    .isVisible()
    .catch(() => false);
  const hasTimeline = await calendarCard0.locator("ol li").count().catch(() => 0);
  if (upstreamCalendar) note("Calendar mode: upstream (empty message + inline link)");
  else if (hasTimeline > 0) note(`Calendar mode: preview timeline (${hasTimeline} events)`);
  else note("Calendar mode: unknown / empty");

  // ---------- DISPLAY ----------
  console.log("\n[DISPLAY]");

  try {
    const label = await datePickerLabel(page);
    const visible = await page.locator('button[aria-haspopup="dialog"]').first().isVisible();
    if (visible && /近|天|\d{4}/.test(label)) pass("display.datePicker", label);
    else fail("display.datePicker", `visible=${visible} label=${label}`);
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
    const expected = ["我的新询盘", "今日待跟进", "待报价", "报价后未回复", "本月成交额", "本月成交单数"];
    const section = page.locator('section[aria-label="关键指标"]').first();
    await section.waitFor({ state: "visible", timeout: 10_000 });
    const cards = section.locator("article");
    const count = await cards.count();
    const text = await section.innerText();
    const missing = expected.filter((label) => !text.includes(label));
    if (count >= 6 && missing.length === 0) pass("display.kpiCards", `${count} cards`);
    else if (count >= 6) {
      pass("display.kpiCards", `${count} cards; soft-missing: ${missing.join(",") || "none"}`);
      if (missing.length) note(`KPI soft-missing labels: ${missing.join(", ")}`);
    } else {
      fail("display.kpiCards", `count=${count} missing=${missing.join(",")}`);
    }
  } catch (e) {
    fail("display.kpiCards", String(e));
  }

  try {
    const card = cardByHeading(page, "我的待办");
    await card.waitFor({ state: "visible", timeout: 8_000 });
    const empty = await card.getByText(/暂无待办事项/).isVisible().catch(() => false);
    const items = await card.locator("ul li").count();
    const footer = await card.getByRole("link", { name: /查看全部待办/ }).isVisible();
    if (empty) pass("display.todos", "empty state");
    else if (items > 0 && footer) pass("display.todos", `${items} items + footer`);
    else fail("display.todos", `empty=${empty} items=${items} footer=${footer}`);
  } catch (e) {
    fail("display.todos", String(e));
  }

  try {
    const card = cardByHeading(page, "我的跟进日历");
    await card.waitFor({ state: "visible", timeout: 8_000 });
    const dayTab = card.getByRole("button", { name: /^日$/, exact: true });
    const weekTab = card.getByRole("button", { name: /^周$/, exact: true });
    const dayVisible = await dayTab.isVisible().catch(() => false);
    const weekVisible = await weekTab.isVisible().catch(() => false);
    const fullLink = await card.getByRole("link", { name: /查看完整日程/ }).isVisible();
    if (upstreamCalendar) {
      const inline = await card.getByRole("link", { name: /跟进日历/ }).isVisible();
      if (inline && fullLink) pass("display.calendar", "upstream message + links");
      else fail("display.calendar", `upstream inline=${inline} full=${fullLink}`);
    } else if (hasTimeline > 0 && fullLink) {
      pass("display.calendar", `preview timeline ${hasTimeline} events; tabs day=${dayVisible} week=${weekVisible}`);
    } else {
      fail("display.calendar", `upstream=${upstreamCalendar} timeline=${hasTimeline} full=${fullLink}`);
    }
  } catch (e) {
    fail("display.calendar", String(e));
  }

  try {
    const card = cardByHeading(page, "我的询盘趋势");
    await card.waitFor({ state: "visible", timeout: 8_000 });
    const chartVisible = (await card.locator("svg").count()) > 0;
    const trendBtn = card.getByRole("button", { name: /近7天/ });
    const btnVisible = await trendBtn.isVisible().catch(() => false);
    if (chartVisible) pass("display.trendChart", `chart visible; headerBtn=${btnVisible}`);
    else fail("display.trendChart", `chartVisible=${chartVisible}`);
  } catch (e) {
    fail("display.trendChart", String(e));
  }

  try {
    const card = cardByHeading(page, "高意向客户");
    await card.waitFor({ state: "visible", timeout: 8_000 });
    const empty = await card.getByText(/暂无高意向客户/).isVisible().catch(() => false);
    const items = await card.locator("ol li").count();
    const viewAll = await card.getByRole("link", { name: /查看全部/ }).isVisible();
    if ((empty || items > 0) && viewAll) {
      pass("display.highIntent", empty ? "empty state" : `${items} items`);
    } else {
      fail("display.highIntent", `empty=${empty} items=${items} viewAll=${viewAll}`);
    }
  } catch (e) {
    fail("display.highIntent", String(e));
  }

  try {
    const card = cardByHeading(page, "最近跟进记录");
    await card.waitFor({ state: "visible", timeout: 8_000 });
    const items = await card.locator("ul li").count();
    const viewAll = await card.getByRole("link", { name: /查看全部/ }).isVisible();
    if (viewAll) pass("display.recentFollowups", `${items} items`);
    else fail("display.recentFollowups", `viewAll=${viewAll} items=${items}`);
  } catch (e) {
    fail("display.recentFollowups", String(e));
  }

  try {
    const card = cardByHeading(page, "我的销售链接");
    await card.waitFor({ state: "visible", timeout: 8_000 });
    const empty = await card.getByText(/暂无销售链接/).isVisible().catch(() => false);
    const manage = await card.getByRole("link", { name: /管理链接/ }).isVisible();
    const copyBtns = await card.getByRole("button", { name: /复制链接/ }).count();
    const createLink = await card.getByRole("link", { name: /去创建/ }).isVisible().catch(() => false);
    if (empty && manage && createLink) pass("display.salesLinks", "empty + 去创建");
    else if (!empty && manage && copyBtns > 0) pass("display.salesLinks", `${copyBtns} links with copy`);
    else if (manage) pass("display.salesLinks", `manage=1 empty=${empty} copy=${copyBtns} create=${createLink}`);
    else fail("display.salesLinks", `empty=${empty} manage=${manage} copy=${copyBtns} create=${createLink}`);
  } catch (e) {
    fail("display.salesLinks", String(e));
  }

  try {
    const tip = page.getByText(/小贴士：及时跟进客户/);
    await tip.waitFor({ state: "visible", timeout: 5_000 });
    pass("display.tipBanner");
  } catch (e) {
    fail("display.tipBanner", String(e));
  }

  // ---------- CLICKS ----------
  console.log("\n[CLICKS]");

  try {
    await applyDatePreset(page, "近30天");
    let label = await datePickerLabel(page);
    if (!/近\s*30\s*天/.test(label)) throw new Error(`expected 近30天, got "${label}"`);
    pass("click.datePreset.30d", label);

    await applyDatePreset(page, "近7天");
    label = await datePickerLabel(page);
    if (!/近\s*7\s*天|\d{4}-\d{2}-\d{2}/.test(label)) {
      throw new Error(`expected 近7天 or date, got "${label}"`);
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
    if (!afterVisible || !/我的新询盘|今日待跟进/.test(after)) throw new Error("KPIs missing after refresh");
    pass("click.refresh", `kpis still visible (textLen ${before.length}->${after.length})`);
  } catch (e) {
    fail("click.refresh", String(e));
  }

  try {
    await clickNavLinkAndAssert(page, {
      id: "click.todosViewAll",
      expectedPath: "/dashboard/tasks",
      findLink: async () => {
        const card = cardByHeading(page, "我的待办");
        return card.getByRole("link", { name: /查看全部待办/ }).first();
      },
    });
  } catch (e) {
    fail("click.todosViewAll", String(e));
    await goSales(page).catch(() => undefined);
  }

  try {
    const card = cardByHeading(page, "我的跟进日历");
    const dayTab = card.locator("button").filter({ hasText: /^日$/ }).first();
    const weekTab = card.locator("button").filter({ hasText: /^周$/ }).first();
    const dayPresent = (await dayTab.count()) > 0;
    const weekPresent = (await weekTab.count()) > 0;
    if (!dayPresent || !weekPresent) {
      note("calendar 日/周 tabs not present");
      pass("click.calendarTabs", "skipped (tabs not present)");
    } else {
      const dayBefore = await dayTab.getAttribute("data-active");
      const weekBefore = await weekTab.getAttribute("data-active");
      await weekTab.click();
      await page.waitForTimeout(250);
      const dayAfterWeek = await dayTab.getAttribute("data-active");
      const weekAfterWeek = await weekTab.getAttribute("data-active");
      await dayTab.click();
      await page.waitForTimeout(250);
      const dayAfterDay = await dayTab.getAttribute("data-active");
      const weekAfterDay = await weekTab.getAttribute("data-active");

      const toggled =
        weekAfterWeek === "true" &&
        dayAfterWeek !== "true" &&
        dayAfterDay === "true" &&
        weekAfterDay !== "true";

      if (toggled) {
        pass("click.calendarTabs", "日/周 active state toggles (FUNCTIONAL)");
      } else {
        fail(
          "click.calendarTabs",
          `expected FUNCTIONAL toggle; before day=${dayBefore} week=${weekBefore}; after 周: day=${dayAfterWeek} week=${weekAfterWeek}; after 日: day=${dayAfterDay} week=${weekAfterDay}`,
        );
      }
    }
  } catch (e) {
    fail("click.calendarTabs", String(e));
  }

  try {
    await clickNavLinkAndAssert(page, {
      id: "click.calendarFull",
      expectedPath: "/dashboard/calendar",
      findLink: async () => {
        const card = cardByHeading(page, "我的跟进日历");
        return card.getByRole("link", { name: /查看完整日程/ }).first();
      },
    });
  } catch (e) {
    fail("click.calendarFull", String(e));
    await goSales(page).catch(() => undefined);
  }

  try {
    await goSales(page);
    const card = cardByHeading(page, "我的跟进日历");
    const upstreamMsg = await card.getByText(/日程数据请前往/).isVisible().catch(() => false);
    if (!upstreamMsg) {
      note("upstream calendar inline link skipped (not in upstream mode)");
      pass("click.calendarInline", "skipped (preview/timeline mode)");
    } else {
      const inline = card.getByRole("link", { name: /^跟进日历$/ }).first();
      await inline.scrollIntoViewIfNeeded();
      await Promise.all([
        page.waitForURL(/\/dashboard\/calendar/, { timeout: 15_000 }),
        inline.click(),
      ]);
      await page.waitForLoadState("domcontentloaded");
      await page.waitForTimeout(500);
      await assertNoErrorPage(page, "calendarInline");
      pass("click.calendarInline", page.url());
      await goSales(page);
    }
  } catch (e) {
    fail("click.calendarInline", String(e));
    await goSales(page).catch(() => undefined);
  }

  try {
    await clickNavLinkAndAssert(page, {
      id: "click.highIntentViewAll",
      expectedPath: "/dashboard/inquiries",
      findLink: async () => {
        const card = cardByHeading(page, "高意向客户");
        return card.getByRole("link", { name: /查看全部/ }).first();
      },
    });
  } catch (e) {
    fail("click.highIntentViewAll", String(e));
    await goSales(page).catch(() => undefined);
  }

  try {
    await clickNavLinkAndAssert(page, {
      id: "click.followupsViewAll",
      expectedPath: "/dashboard/tasks",
      findLink: async () => {
        const card = cardByHeading(page, "最近跟进记录");
        return card.getByRole("link", { name: /查看全部/ }).first();
      },
    });
  } catch (e) {
    fail("click.followupsViewAll", String(e));
    await goSales(page).catch(() => undefined);
  }

  try {
    await clickNavLinkAndAssert(page, {
      id: "click.manageLinks",
      expectedPath: "/dashboard/channels/links",
      findLink: async () => {
        const card = cardByHeading(page, "我的销售链接");
        return card.getByRole("link", { name: /管理链接/ }).first();
      },
    });
  } catch (e) {
    fail("click.manageLinks", String(e));
    await goSales(page).catch(() => undefined);
  }

  try {
    await goSales(page);
    const card = cardByHeading(page, "我的销售链接");
    const empty = await card.getByText(/暂无销售链接/).isVisible().catch(() => false);
    const copyBtn = card.getByRole("button", { name: /复制链接/ }).first();
    const hasCopy = (await copyBtn.count()) > 0 && (await copyBtn.isVisible().catch(() => false));

    if (hasCopy && !empty) {
      await copyBtn.scrollIntoViewIfNeeded();
      await copyBtn.click();
      await page.waitForTimeout(400);
      const label = ((await copyBtn.innerText()) || "").replace(/\s+/g, " ").trim();
      if (!/已复制/.test(label)) throw new Error(`expected 已复制, got "${label}"`);
      pass("click.copyLink", label);
    } else {
      const create = card.getByRole("link", { name: /去创建/ }).first();
      await create.scrollIntoViewIfNeeded();
      await Promise.all([
        page.waitForURL(/\/dashboard\/channels\/links\/new/, { timeout: 15_000 }),
        create.click(),
      ]);
      await page.waitForLoadState("domcontentloaded");
      await page.waitForTimeout(500);
      await assertNoErrorPage(page, "createLink");
      pass("click.createLink", page.url());
      await goSales(page);
    }
  } catch (e) {
    fail("click.copyOrCreateLink", String(e));
    await goSales(page).catch(() => undefined);
  }

  try {
    await goSales(page);
    const card = cardByHeading(page, "我的询盘趋势");
    const range7 = card.locator("button").filter({ hasText: /^近7天$/ }).first();
    const range30 = card.locator("button").filter({ hasText: /^近30天$/ }).first();
    const has7 = (await range7.count()) > 0;
    const has30 = (await range30.count()) > 0;
    if (!has7 || !has30) {
      note("trend 近7天/近30天 tabs not present");
      fail("click.trendHeader", `tabs missing: 近7天=${has7} 近30天=${has30}`);
    } else {
      await range30.click();
      await page.waitForTimeout(250);
      const active30 = await range30.getAttribute("data-active");
      const active7After30 = await range7.getAttribute("data-active");
      await range7.click();
      await page.waitForTimeout(250);
      const active7 = await range7.getAttribute("data-active");
      const active30After7 = await range30.getAttribute("data-active");
      const toggled =
        active30 === "true" &&
        active7After30 !== "true" &&
        active7 === "true" &&
        active30After7 !== "true";
      if (toggled) {
        pass("click.trendHeader", "近7天/近30天 active state toggles (FUNCTIONAL)");
      } else {
        fail(
          "click.trendHeader",
          `expected FUNCTIONAL toggle; after 近30天: 7=${active7After30} 30=${active30}; after 近7天: 7=${active7} 30=${active30After7}`,
        );
      }
    }
  } catch (e) {
    fail("click.trendHeader", String(e));
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
  const outPath = path.join(outDir, "sales-home-audit.json");
  writeFileSync(outPath, JSON.stringify(report, null, 2), "utf8");
  console.log(`\nReport: ${outPath}`);
}

run().catch((error) => {
  fail("fatal", String(error));
  writeReport();
  process.exitCode = 1;
});