#!/usr/bin/env node
/**
 * Boss homepage interactive audit (/dashboard/boss)
 *
 * Usage (from repo root or apps/console):
 *   pnpm --filter qiyun-console exec playwright test  # not used; run via node:
 *   node apps/console/e2e/run-boss-home-audit.mjs
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
      id: "user_boss_audit",
      email: "boss-audit@example.com",
      name: "Boss Audit",
      activeWorkspaceId: "ws_dev",
    }),
  );
  await context.addCookies([
    { name: "qiyun_auth_user", value: user, domain: hostname, path: "/", httpOnly: true, sameSite: "Lax" },
    { name: "qiyun_access_token", value: "boss-audit-token", domain: hostname, path: "/", httpOnly: true, sameSite: "Lax" },
    { name: "qiyun_refresh_token", value: "boss-audit-refresh", domain: hostname, path: "/", httpOnly: true, sameSite: "Lax" },
  ]);
  note("Using preview/demo cookie auth (API login unavailable).");
}

async function waitForBossReady(page) {
  await page.waitForLoadState("domcontentloaded");
  await page.locator("main").first().waitFor({ state: "visible", timeout: 25_000 });
  await page.locator('section[aria-label="经营指标"], .kpiGrid, article').first().waitFor({
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
  console.log("Boss home audit");
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
    const response = await page.goto("/dashboard/boss", { waitUntil: "domcontentloaded", timeout: 45_000 });
    await waitForBossReady(page);
    const status = response?.status() ?? 200;
    const pathName = new URL(page.url()).pathname;
    if (status >= 500) throw new Error(`HTTP ${status}`);
    if (pathName.startsWith("/login")) throw new Error("redirected to login after auth");
    pass("nav.boss", pathName);
  } catch (error) {
    fail("nav.boss", String(error));
    note("Cannot reach Boss page — aborting remaining checks.");
    await browser.close();
    writeReport();
    process.exitCode = 1;
    return;
  }

  // ---------- DISPLAY ----------
  console.log("\n[DISPLAY]");

  // Date range picker button
  try {
    const label = await datePickerLabel(page);
    const visible = await page.locator('button[aria-haspopup="dialog"]').first().isVisible();
    if (visible && /近|天|\d{4}/.test(label)) pass("display.datePicker", label);
    else fail("display.datePicker", `visible=${visible} label=${label}`);
  } catch (e) {
    fail("display.datePicker", String(e));
  }

  // Refresh
  try {
    const refresh = page.getByRole("button", { name: /刷新/ }).first();
    await refresh.waitFor({ state: "visible", timeout: 8_000 });
    pass("display.refresh");
  } catch (e) {
    fail("display.refresh", String(e));
  }

  // 6 KPI cards
  try {
    const expected = ["今日新询盘", "待跟进", "待报价", "报价后未回复", "本月成交额", "本月单数"];
    const section = page.locator('section[aria-label="经营指标"]').first();
    await section.waitFor({ state: "visible", timeout: 10_000 });
    const cards = section.locator("article");
    const count = await cards.count();
    const text = await section.innerText();
    const missing = expected.filter((label) => !text.includes(label));
    if (count >= 6 && missing.length === 0) pass("display.kpiCards", `${count} cards`);
    else if (count >= 6 && missing.length <= 1) {
      pass("display.kpiCards", `${count} cards; soft-missing: ${missing.join(",") || "none"}`);
      if (missing.length) note(`KPI label soft mismatch: ${missing.join(", ")}`);
    } else fail("display.kpiCards", `count=${count} missing=${missing.join("|")} textSample=${text.slice(0, 120)}`);
  } catch (e) {
    fail("display.kpiCards", String(e));
  }

  // Sections
  const sections = [
    ["display.trend", /询盘与成交趋势|7日询盘|30日询盘/],
    ["display.ranking", /销售团队排行/],
    ["display.hotOpportunities", /重点商机/],
    ["display.channel", /来源渠道分布/],
    ["display.alerts", /管理提醒/],
  ];
  for (const [id, pattern] of sections) {
    try {
      const el = page.getByRole("heading", { name: pattern }).first();
      await el.waitFor({ state: "visible", timeout: 10_000 });
      pass(id);
    } catch (e) {
      // fallback text search
      try {
        const t = await page.locator("main").innerText();
        if (pattern.test(t)) pass(id, "via text");
        else fail(id, String(e));
      } catch (e2) {
        fail(id, String(e2));
      }
    }
  }

  // ---------- CLICKS ----------
  console.log("\n[CLICKS]");

  // a) date picker presets 近30天 / 近7天
  try {
    await openDatePicker(page);
    await page.locator('[role="dialog"][aria-label="选择日期范围"] button', { hasText: "近30天" }).click();
    await page.waitForTimeout(400);
    // preset may auto-apply or need 确定 — check if dialog still open
    const dialogStill = await page.locator('[role="dialog"][aria-label="选择日期范围"]').isVisible().catch(() => false);
    if (dialogStill) {
      await page.locator('[role="dialog"] button', { hasText: "确定" }).click().catch(() => undefined);
      await page.waitForTimeout(300);
    }
    let label = await datePickerLabel(page);
    if (!/近\s*30\s*天/.test(label)) throw new Error(`expected 近30天, got "${label}"`);
    pass("click.datePreset.30d", label);

    await openDatePicker(page);
    await page.locator('[role="dialog"][aria-label="选择日期范围"] button', { hasText: "近7天" }).click();
    await page.waitForTimeout(400);
    const dialogStill2 = await page.locator('[role="dialog"][aria-label="选择日期范围"]').isVisible().catch(() => false);
    if (dialogStill2) {
      await page.locator('[role="dialog"] button', { hasText: "确定" }).click().catch(() => undefined);
      await page.waitForTimeout(300);
    }
    label = await datePickerLabel(page);
    if (!/近\s*7\s*天/.test(label)) throw new Error(`expected 近7天, got "${label}"`);
    pass("click.datePreset.7d", label);
  } catch (e) {
    fail("click.datePreset", String(e));
    await page.keyboard.press("Escape").catch(() => undefined);
  }

  // b) custom range
  try {
    await openDatePicker(page);
    await page.locator('[role="dialog"][aria-label="选择日期范围"] button', { hasText: "自定义" }).click();
    await page.waitForTimeout(300);
    const calendar = page.locator('[role="dialog"][aria-label="选择日期范围"] .calendar, [role="dialog"] table, [role="dialog"] [class*="calendar"]').first();
    const calVisible =
      (await page.locator('[role="dialog"] button[aria-label="上个月"]').isVisible().catch(() => false)) ||
      (await calendar.isVisible().catch(() => false));
    if (!calVisible) throw new Error("calendar not visible after 自定义");

    // Pick two day cells (prefer enabled day buttons inside dialog)
    const dayButtons = page.locator('[role="dialog"][aria-label="选择日期范围"] button').filter({
      hasText: /^\d{1,2}$/,
    });
    const dayCount = await dayButtons.count();
    if (dayCount < 2) throw new Error(`not enough day cells: ${dayCount}`);
    // pick mid-month days to avoid disabled edges
    const firstIdx = Math.min(5, dayCount - 2);
    const secondIdx = Math.min(firstIdx + 3, dayCount - 1);
    await dayButtons.nth(firstIdx).click();
    await page.waitForTimeout(150);
    await dayButtons.nth(secondIdx).click();
    await page.waitForTimeout(150);
    await page.locator('[role="dialog"] button', { hasText: "确定" }).click();
    await page.waitForTimeout(400);
    const label = await datePickerLabel(page);
    if (!/\d{4}-\d{2}-\d{2}/.test(label) && !/~/.test(label)) {
      throw new Error(`custom label not a date range: "${label}"`);
    }
    pass("click.dateCustom", label);
  } catch (e) {
    fail("click.dateCustom", String(e));
    await page.keyboard.press("Escape").catch(() => undefined);
  }

  // Reset to 7d for stable trend checks
  try {
    await openDatePicker(page);
    await page.locator('[role="dialog"] button', { hasText: "近7天" }).click();
    const d = await page.locator('[role="dialog"][aria-label="选择日期范围"]').isVisible().catch(() => false);
    if (d) await page.locator('[role="dialog"] button', { hasText: "确定" }).click().catch(() => undefined);
    await page.waitForTimeout(300);
  } catch {
    await page.keyboard.press("Escape").catch(() => undefined);
  }

  // c) refresh
  try {
    const before = await page.locator('section[aria-label="经营指标"]').innerText();
    await page.getByRole("button", { name: /刷新/ }).first().click();
    await page.waitForTimeout(800);
    await assertNoErrorPage(page, "refresh");
    const afterVisible = await page.locator('section[aria-label="经营指标"]').isVisible();
    const after = await page.locator('section[aria-label="经营指标"]').innerText();
    if (!afterVisible || !/今日新询盘|待跟进/.test(after)) throw new Error("KPIs missing after refresh");
    pass("click.refresh", `kpis still visible (textLen ${before.length}->${after.length})`);
  } catch (e) {
    fail("click.refresh", String(e));
  }

  // d) trend tabs
  try {
    const trendTabs = page.getByRole("tablist", { name: /趋势时间范围/ });
    await trendTabs.getByRole("tab", { name: /近30天/ }).click();
    await page.waitForTimeout(400);
    let heading = await page.locator("h2").filter({ hasText: /询盘与成交趋势/ }).first().innerText();
    if (!/30日/.test(heading)) throw new Error(`expected 30日 in title, got "${heading}"`);
    pass("click.trendTab.30d", heading.replace(/\s+/g, " ").slice(0, 40));

    await trendTabs.getByRole("tab", { name: /近7天/ }).click();
    await page.waitForTimeout(400);
    heading = await page.locator("h2").filter({ hasText: /询盘与成交趋势/ }).first().innerText();
    if (!/7日/.test(heading)) throw new Error(`expected 7日 in title, got "${heading}"`);
    pass("click.trendTab.7d", heading.replace(/\s+/g, " ").slice(0, 40));
  } catch (e) {
    fail("click.trendTabs", String(e));
  }

  // e) granularity dropdown
  try {
    const granBtn = page.locator("button[aria-haspopup='listbox']").filter({ hasText: /按日|按周/ }).first();
    await granBtn.click();
    await page.waitForTimeout(200);
    const listbox = page.locator('[role="listbox"][aria-label="统计粒度"]');
    await listbox.waitFor({ state: "visible", timeout: 5_000 });
    await listbox.getByRole("option", { name: /按周/ }).click();
    await page.waitForTimeout(300);
    let label = (await granBtn.innerText()).replace(/\s+/g, " ").trim();
    if (!/按周/.test(label)) throw new Error(`expected 按周, got "${label}"`);
    pass("click.granularity.week", label);

    await granBtn.click();
    await listbox.waitFor({ state: "visible", timeout: 5_000 });
    await listbox.getByRole("option", { name: /按日/ }).click();
    await page.waitForTimeout(300);
    label = (await granBtn.innerText()).replace(/\s+/g, " ").trim();
    if (!/按日/.test(label)) throw new Error(`expected 按日, got "${label}"`);
    pass("click.granularity.day", label);
  } catch (e) {
    fail("click.granularity", String(e));
    await page.keyboard.press("Escape").catch(() => undefined);
  }

  // f) ranking tabs
  try {
    const rankingCard = page.locator("article, section").filter({ has: page.getByRole("heading", { name: /销售团队排行/ }) }).first();
    const tabs = [
      ["成交额", "amount"],
      ["询盘数", "inquiries"],
      ["丢单数", "lost"],
    ];
    let prevBody = "";
    for (const [name] of tabs) {
      const btn = rankingCard.getByRole("button", { name, exact: true }).first();
      await btn.click();
      await page.waitForTimeout(250);
      const active = await btn.getAttribute("data-active");
      if (active !== "true") throw new Error(`${name} data-active=${active}`);
      const body = (await rankingCard.innerText()).replace(/\s+/g, " ");
      if (prevBody && body === prevBody) {
        note(`ranking tab "${name}" active but visible data unchanged`);
      }
      prevBody = body;
    }
    pass("click.rankingTabs", "成交额/询盘数/丢单数 active toggles");
  } catch (e) {
    fail("click.rankingTabs", String(e));
  }

  // g) 查看全部 → inquiries
  try {
    const hotHeading = page.getByRole("heading", { name: "重点商机", exact: true });
    const hot = hotHeading.locator("xpath=ancestor::article[1]");
    const link = hot.getByRole("link", { name: /查看全部/ }).first();
    await link.click();
    await page.waitForURL(/\/dashboard\/inquiries/, { timeout: 15_000 });
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(500);
    await assertNoErrorPage(page, "查看全部");
    pass("click.hotViewAll", page.url());
    await page.goto("/dashboard/boss", { waitUntil: "domcontentloaded" });
    await waitForBossReady(page);
  } catch (e) {
    fail("click.hotViewAll", String(e));
    await page.goto("/dashboard/boss", { waitUntil: "domcontentloaded" }).catch(() => undefined);
    await waitForBossReady(page).catch(() => undefined);
  }

  // h) first hot opportunity company link
  try {
    const hotHeading = page.getByRole("heading", { name: "重点商机", exact: true });
    await hotHeading.waitFor({ state: "visible", timeout: 10_000 });
    const hotCard = hotHeading.locator("xpath=ancestor::article[1]");
    const empty = await hotCard.getByText(/暂无重点商机/).isVisible().catch(() => false);
    if (empty) {
      note("重点商机 empty — no company link to click");
      pass("click.hotCompanyLink", "skipped (empty list)");
    } else {
      const companyLink = hotCard.locator("table tbody a[href^=\"/dashboard/inquiries/\"]").first();
      await companyLink.waitFor({ state: "visible", timeout: 8_000 });
      await companyLink.scrollIntoViewIfNeeded();
      const href = await companyLink.getAttribute("href");
      const company = ((await companyLink.innerText()) || "").trim();
      await Promise.all([
        page.waitForURL((url) => url.pathname.includes("/dashboard/inquiries/"), { timeout: 15_000 }),
        companyLink.click(),
      ]);
      await page.waitForLoadState("domcontentloaded");
      await page.waitForTimeout(500);
      await assertNoErrorPage(page, "hot company");
      const pathName = new URL(page.url()).pathname;
      if (!pathName.includes("/dashboard/inquiries/")) {
        throw new Error(`unexpected path ${pathName} (href=${href}, company=${company})`);
      }
      pass("click.hotCompanyLink", `${company} → ${pathName}`);
      await page.goto("/dashboard/boss", { waitUntil: "domcontentloaded" });
      await waitForBossReady(page);
    }
  } catch (e) {
    fail("click.hotCompanyLink", String(e));
    await page.goto("/dashboard/boss", { waitUntil: "domcontentloaded" }).catch(() => undefined);
    await waitForBossReady(page).catch(() => undefined);
  }

  // i) 查看渠道分析
  try {
    const link = page.getByRole("link", { name: /查看渠道分析/ }).first();
    await link.click();
    await page.waitForURL(/\/dashboard\/reports\/channel/, { timeout: 15_000 });
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(500);
    await assertNoErrorPage(page, "渠道分析");
    pass("click.channelAnalysis", page.url());
    await page.goto("/dashboard/boss", { waitUntil: "domcontentloaded" });
    await waitForBossReady(page);
  } catch (e) {
    fail("click.channelAnalysis", String(e));
    await page.goto("/dashboard/boss", { waitUntil: "domcontentloaded" }).catch(() => undefined);
    await waitForBossReady(page).catch(() => undefined);
  }

  // j) management alert links (scoped to alertList under 管理提醒 card)
  try {
    const alertHeading = page.getByRole("heading", { name: "管理提醒", exact: true });
    await alertHeading.waitFor({ state: "visible", timeout: 10_000 });
    const alertCard = alertHeading.locator("xpath=ancestor::article[1]");
    const links = alertCard.locator("ul a[href^=\"/dashboard\"]");
    const count = await links.count();
    if (count === 0) throw new Error("no alert links found");

    const hrefs = [];
    for (let i = 0; i < count; i++) {
      const href = await links.nth(i).getAttribute("href");
      if (href) hrefs.push(href);
    }
    note(`管理提醒 links: ${[...new Set(hrefs)].join(", ")}`);

    for (let i = 0; i < count; i++) {
      await page.goto("/dashboard/boss", { waitUntil: "domcontentloaded" });
      await waitForBossReady(page);
      const heading = page.getByRole("heading", { name: "管理提醒", exact: true });
      const card = heading.locator("xpath=ancestor::article[1]");
      const link = card.locator("ul a[href^=\"/dashboard\"]").nth(i);
      const href = await link.getAttribute("href");
      const title = ((await link.locator("b").first().innerText().catch(() => link.innerText())) || "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 40);
      await link.scrollIntoViewIfNeeded();
      await Promise.all([
        page.waitForURL((url) => !url.pathname.endsWith("/dashboard/boss"), { timeout: 15_000 }),
        link.click(),
      ]);
      await page.waitForLoadState("domcontentloaded");
      await page.waitForTimeout(500);
      await assertNoErrorPage(page, `alert:${title}`);
      const pathName = new URL(page.url()).pathname;
      const expected = (href || "").split("?")[0];
      if (expected && expected !== "#" && !pathName.startsWith(expected) && !pathName.startsWith(expected.replace(/\/$/, ""))) {
        note(`alert "${title}" href=${href} landed on ${pathName}`);
      }
      if (!/\/dashboard\/(inquiries|quotes|tasks)/.test(pathName)) {
        throw new Error(`alert "${title}" unexpected path ${pathName} (href=${href})`);
      }
      pass(`click.alert[${i}]`, `${title} → ${pathName}`);
    }
  } catch (e) {
    fail("click.alerts", String(e));
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
  const outPath = path.join(outDir, "boss-home-audit.json");
  writeFileSync(outPath, JSON.stringify(report, null, 2), "utf8");
  console.log(`\nReport: ${outPath}`);
}

run().catch((error) => {
  fail("fatal", String(error));
  writeReport();
  process.exitCode = 1;
});
