#!/usr/bin/env node
/**
 * Sequential Console sidebar primary-pages audit (navigation order).
 *
 * Usage:
 *   cd apps/console && node e2e/run-nav-pages-audit.mjs
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
const maxClicks = Number(process.env.MAX_CLICKS_PER_PAGE || 5);

/** Primary sidebar pages in navigation.ts group order */
const PAGES = [
  { order: 1, path: "/dashboard/boss", name: "boss", label: "首页" },
  { order: 2, path: "/dashboard/admin", name: "admin", label: "首页" },
  { order: 3, path: "/dashboard/sales-rep", name: "sales-rep", label: "首页" },
  { order: 4, path: "/dashboard/quick-entry", name: "quick-entry", label: "快速录入" },
  { order: 5, path: "/dashboard/inquiries", name: "inquiries", label: "询盘中心" },
  { order: 6, path: "/dashboard/tasks", name: "tasks", label: "跟进任务" },
  { order: 7, path: "/dashboard/bots/landing", name: "landing", label: "AI选型页" },
  { order: 8, path: "/dashboard/sites", name: "sites", label: "官网Widget" },
  { order: 9, path: "/dashboard/channels/links", name: "links", label: "销售链接" },
  { order: 10, path: "/dashboard/channels/qrcodes", name: "qrcodes", label: "二维码" },
  { order: 11, path: "/dashboard/bots", name: "bots", label: "AI助手" },
  { order: 12, path: "/dashboard/knowledge-bases", name: "knowledge", label: "知识库" },
  { order: 13, path: "/dashboard/conversations/test", name: "ai-test", label: "AI测试" },
  { order: 14, path: "/dashboard/quotes", name: "quotes", label: "报价列表" },
  { order: 15, path: "/dashboard/quotes/templates", name: "templates", label: "报价模板" },
  { order: 16, path: "/dashboard/reports/channel", name: "channel", label: "渠道分析" },
  { order: 17, path: "/dashboard/reports/channel", name: "channel", label: "渠道分析" },
  { order: 18, path: "/dashboard/reports/follow-up", name: "follow-up", label: "销售分析" },
  { order: 19, path: "/dashboard/reports/export", name: "export", label: "报表导出" },
  { order: 20, path: "/dashboard/team/profile", name: "profile", label: "企业资料" },
  { order: 21, path: "/dashboard/team", name: "team", label: "团队成员" },
  { order: 22, path: "/dashboard/team/roles", name: "roles", label: "角色权限" },
  { order: 23, path: "/dashboard/logs", name: "logs", label: "操作日志" },
  { order: 24, path: "/dashboard/settings/account", name: "account", label: "个人设置" },
];

const preferredClickPattern =
  /新建|创建|查看|刷新|导出|筛选|保存|编辑|详情|预览|复制|下载|邀请|上传|搜索|重置|全部|今日|本周|本月|近\s*7|近\s*30|打开|进入|管理|配置|安装|生成|测试|开始/;

const destructivePattern =
  /删除|移除|停用|禁用|清空|注销|退出|登出|解除|解绑|驳回|拒绝|归档|强制|重置密码|确认删除|永久/;

function waitForHttp(url, timeoutMs = 20_000) {
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

async function loginViaConsole() {
  const res = await fetch(`${consoleBase}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`Console login HTTP ${res.status}`);
  const j = await res.json();
  const payload = j.data ?? j;
  const accessToken = payload.tokens?.accessToken ?? payload.accessToken;
  const refreshToken = payload.tokens?.refreshToken ?? payload.refreshToken;
  const user = payload.user;
  if (!accessToken || !user) throw new Error("Console login missing token/user");
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
      id: "user_nav_audit",
      email: "nav-audit@example.com",
      name: "Nav Audit",
      activeWorkspaceId: "ws_dev",
    }),
  );
  await context.addCookies([
    { name: "qiyun_auth_user", value: user, domain: hostname, path: "/", httpOnly: true, sameSite: "Lax" },
    { name: "qiyun_access_token", value: "nav-audit-token", domain: hostname, path: "/", httpOnly: true, sameSite: "Lax" },
    { name: "qiyun_refresh_token", value: "nav-audit-refresh", domain: hostname, path: "/", httpOnly: true, sameSite: "Lax" },
  ]);
}

function isErrorBody(text) {
  return /Application error|Internal Server Error|Something went wrong|页面不存在|This page could not be found|404 Not Found/i.test(
    text,
  );
}

function isLoginBody(text) {
  return /登录到 AI云|登录账号|忘记密码/.test(text) && /密码/.test(text);
}

async function assertDisplayOk(page) {
  await page.waitForLoadState("domcontentloaded");
  await page.locator("main").first().waitFor({ state: "visible", timeout: 25_000 });
  const pathName = new URL(page.url()).pathname;
  if (pathName.startsWith("/login")) throw new Error("redirected to login");

  // Client pages hydrate after first paint — poll until main has meaningful content.
  const deadline = Date.now() + 25_000;
  let bodyText = "";
  let mainText = "";
  while (Date.now() < deadline) {
    bodyText = ((await page.locator("body").innerText().catch(() => "")) || "").slice(0, 4000);
    if (isErrorBody(bodyText)) throw new Error("error page content detected");
    if (isLoginBody(bodyText)) throw new Error("login page content detected");
    mainText = ((await page.locator("main").first().innerText().catch(() => "")) || "")
      .replace(/\s+/g, " ")
      .trim();
    const loadingOnly =
      /^(加载中|Loading|请稍候|\.+|)$/i.test(mainText) ||
      mainText.length < 12 ||
      /^加载中/.test(mainText);
    if (!loadingOnly) return { bodyText, mainText };
    await page.waitForTimeout(400);
  }
  throw new Error(`blank/meaningless main (len=${mainText.length})`);
}

async function captureHeadings(page) {
  return page.evaluate(() => {
    const title = document.title || "";
    const h1 = Array.from(document.querySelectorAll("main h1, h1"))
      .map((el) => (el.textContent || "").replace(/\s+/g, " ").trim())
      .filter(Boolean)
      .slice(0, 3);
    const h2 = Array.from(document.querySelectorAll("main h2"))
      .map((el) => (el.textContent || "").replace(/\s+/g, " ").trim())
      .filter(Boolean)
      .slice(0, 5);
    return { title, h1, h2 };
  });
}

async function collectClickCandidates(page) {
  return page.locator("main button, main a[href], main [role='tab'], main [role='button']").evaluateAll(
    (elements, patterns) => {
      const preferred = new RegExp(patterns.preferred);
      const destructive = new RegExp(patterns.destructive);
      const scored = [];
      for (let index = 0; index < elements.length; index++) {
        const element = elements[index];
        const style = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        const name = (element.getAttribute("aria-label") || element.textContent || "").replace(/\s+/g, " ").trim();
        const href = element instanceof HTMLAnchorElement ? element.getAttribute("href") || "" : "";
        const target = element instanceof HTMLAnchorElement ? element.getAttribute("target") || "" : "";
        const role = element.getAttribute("role") || element.tagName.toLowerCase();
        const disabled =
          element.hasAttribute("disabled") ||
          element.getAttribute("aria-disabled") === "true" ||
          style.pointerEvents === "none";
        const visible =
          rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none" && style.opacity !== "0";
        if (!visible || disabled || !name || name.length > 60) continue;
        if (destructive.test(name)) continue;
        if (target === "_blank") continue;
        if (/^https?:\/\//i.test(href) && !href.includes(location.host)) continue;
        if (href.startsWith("mailto:") || href.startsWith("tel:")) continue;
        if (href.includes("logout") || href.includes("sign-out")) continue;

        let score = 0;
        if (preferred.test(name)) score += 10;
        if (href.startsWith("/dashboard")) score += 4;
        if (role === "tab") score += 3;
        if (element.tagName === "BUTTON" || role === "button") score += 2;
        // Prefer shorter primary CTAs
        if (name.length <= 8) score += 1;

        const auditId = `nav-audit-${index}`;
        element.setAttribute("data-nav-audit-id", auditId);
        scored.push({ auditId, name: name.slice(0, 80), href, role, score });
      }
      scored.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, "zh"));
      const seen = new Set();
      const unique = [];
      for (const item of scored) {
        const key = `${item.role}|${item.name}|${item.href}`;
        if (seen.has(key)) continue;
        seen.add(key);
        unique.push(item);
      }
      return unique;
    },
    { preferred: preferredClickPattern.source, destructive: destructivePattern.source },
  );
}

async function dismissDialogs(page) {
  const dialog = page.locator('[role="dialog"], [role="alertdialog"]').first();
  if (await dialog.isVisible().catch(() => false)) {
    const cancel = dialog.getByRole("button", { name: /取消|关闭|否|稍后|Cancel|Close/i }).first();
    if (await cancel.isVisible().catch(() => false)) {
      await cancel.click({ timeout: 3_000 }).catch(() => undefined);
    } else {
      await page.keyboard.press("Escape").catch(() => undefined);
    }
    await page.waitForTimeout(200);
  }
}

async function clickCandidate(page, candidate, returnPath) {
  const main = page.locator("main").first();
  const control = main.locator(`[data-nav-audit-id="${candidate.auditId}"]`).first();
  const beforeUrl = page.url();
  const beforePath = new URL(beforeUrl).pathname;
  const beforeBase = beforeUrl.split("?")[0];

  await control.scrollIntoViewIfNeeded().catch(() => undefined);

  const navPromise = page
    .waitForURL((url) => url.href.split("?")[0] !== beforeBase, { timeout: 6_000 })
    .then(() => true)
    .catch(() => false);

  await control.click({ timeout: 8_000, noWaitAfter: true });
  const didNavigate = await navPromise;
  await page.waitForTimeout(350);
  await dismissDialogs(page);

  const afterUrl = page.url();
  const afterPath = new URL(afterUrl).pathname;
  const navigated = didNavigate || afterPath !== beforePath || afterUrl.split("?")[0] !== beforeBase;

  if (navigated) {
    await page.waitForLoadState("domcontentloaded").catch(() => undefined);
    await page.locator("main").first().waitFor({ state: "visible", timeout: 20_000 }).catch(() => undefined);
    try {
      await assertDisplayOk(page);
    } catch (err) {
      throw new Error(`destination not ok (${afterPath}): ${err.message || err}`);
    }
    if (afterPath.startsWith("/login")) throw new Error(`navigated to login (${afterPath})`);

    await page.goto(returnPath, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await assertDisplayOk(page);
    return { result: "pass", detail: `nav → ${afterPath}` };
  }

  await page.waitForTimeout(200);
  await page.locator("main").first().waitFor({ state: "visible", timeout: 10_000 });
  const bodyText = ((await page.locator("body").innerText().catch(() => "")) || "").slice(0, 2500);
  if (isErrorBody(bodyText)) throw new Error("same-page crash/error");
  return { result: "pass", detail: "same-page ok" };
}

async function auditPage(page, entry) {
  const notes = [];
  const clicks = [];
  let display = "fail";
  let title = "";
  let headings = { h1: [], h2: [] };

  try {
    const response = await page.goto(entry.path, { waitUntil: "domcontentloaded", timeout: 45_000 });
    const status = response?.status() ?? 200;
    if (status >= 500) throw new Error(`HTTP ${status}`);
    const { mainText } = await assertDisplayOk(page);
    headings = await captureHeadings(page);
    title = headings.h1[0] || headings.title || entry.label;
    if (mainText.length < 20) notes.push(`short main content len=${mainText.length}`);
    display = "pass";
  } catch (error) {
    display = "fail";
    notes.push(`display: ${String(error)}`);
    return {
      order: entry.order,
      path: entry.path,
      name: entry.name,
      label: entry.label,
      title,
      display,
      clicks,
      notes,
      ok: false,
    };
  }

  try {
    const candidates = (await collectClickCandidates(page)).slice(0, maxClicks);
    if (candidates.length === 0) {
      notes.push("no interactive controls found in main");
    }
    for (const candidate of candidates) {
      try {
        // Re-navigate each click for stability (DOM may remount)
        await page.goto(entry.path, { waitUntil: "domcontentloaded", timeout: 45_000 });
        await assertDisplayOk(page);
        // Re-tag candidates after remount
        const refreshed = await collectClickCandidates(page);
        const match =
          refreshed.find((c) => c.name === candidate.name && c.href === candidate.href) ||
          refreshed.find((c) => c.name === candidate.name) ||
          refreshed.find((c) => c.auditId === candidate.auditId);
        if (!match) {
          clicks.push({ label: candidate.name, result: "skip", detail: "control not found after reload" });
          continue;
        }
        const outcome = await clickCandidate(page, match, entry.path);
        clicks.push({ label: candidate.name, result: outcome.result, detail: outcome.detail });
      } catch (error) {
        clicks.push({ label: candidate.name, result: "fail", detail: String(error).slice(0, 200) });
        await dismissDialogs(page);
        await page.goto(entry.path, { waitUntil: "domcontentloaded", timeout: 45_000 }).catch(() => undefined);
      }
    }
  } catch (error) {
    notes.push(`clicks: ${String(error)}`);
  }

  const clickFailed = clicks.some((c) => c.result === "fail");
  const ok = display === "pass" && !clickFailed;
  return {
    order: entry.order,
    path: entry.path,
    name: entry.name,
    label: entry.label,
    title: title || entry.label,
    h1: headings.h1,
    h2: headings.h2,
    display,
    clicks,
    notes,
    ok,
  };
}

async function checkDashboardRedirect(page) {
  const notes = [];
  try {
    const response = await page.goto("/dashboard", { waitUntil: "domcontentloaded", timeout: 45_000 });
    const status = response?.status() ?? 200;
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(800);
    const finalPath = new URL(page.url()).pathname;
    const bodyText = ((await page.locator("body").innerText().catch(() => "")) || "").slice(0, 2500);
    if (status >= 500) throw new Error(`HTTP ${status}`);
    if (finalPath.startsWith("/login") || isLoginBody(bodyText)) throw new Error("redirected to login");
    if (isErrorBody(bodyText)) throw new Error("error page");
    const sensible = /^\/dashboard(\/|$)/.test(finalPath);
    if (!sensible) throw new Error(`unexpected destination ${finalPath}`);
    const mainVisible = await page.locator("main").first().isVisible().catch(() => false);
    if (!mainVisible && finalPath === "/dashboard") {
      // may still be redirecting
      await page.waitForTimeout(1500);
    }
    notes.push(`redirected to ${finalPath}`);
    return { path: "/dashboard", finalPath, ok: true, notes };
  } catch (error) {
    return { path: "/dashboard", finalPath: "", ok: false, notes: [String(error)] };
  }
}

function formatClickSummary(clicks) {
  if (!clicks.length) return "no-clicks";
  const pass = clicks.filter((c) => c.result === "pass").length;
  const fail = clicks.filter((c) => c.result === "fail").length;
  const skip = clicks.filter((c) => c.result === "skip").length;
  return `${pass}p/${fail}f/${skip}s of ${clicks.length}`;
}

function writeReport(report) {
  const outDir = path.join(e2eDir, "audit-results");
  mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "nav-pages-audit.json");
  writeFileSync(outPath, JSON.stringify(report, null, 2), "utf8");
  console.log(`\nReport: ${outPath}`);
  return outPath;
}

function printTable(pages, dashboard) {
  console.log("\n========== NAV PAGES AUDIT (ordered) ==========");
  console.log(
    [
      "Ord".padEnd(4),
      "Path".padEnd(34),
      "Disp".padEnd(6),
      "Clicks".padEnd(16),
      "Status".padEnd(8),
      "Title",
    ].join(" "),
  );
  console.log("-".repeat(100));
  if (dashboard) {
    console.log(
      [
        "—".padEnd(4),
        "/dashboard".padEnd(34),
        (dashboard.ok ? "pass" : "fail").padEnd(6),
        "redirect".padEnd(16),
        (dashboard.ok ? "PASS" : "FAIL").padEnd(8),
        dashboard.finalPath || dashboard.notes.join("; "),
      ].join(" "),
    );
  }
  for (const p of pages) {
    console.log(
      [
        String(p.order).padEnd(4),
        p.path.padEnd(34),
        p.display.padEnd(6),
        formatClickSummary(p.clicks).padEnd(16),
        (p.ok ? "PASS" : "FAIL").padEnd(8),
        (p.title || p.label || "").slice(0, 40),
      ].join(" "),
    );
  }
  console.log("-".repeat(100));
}

async function run() {
  console.log("Nav pages sequential audit");
  console.log(`Console: ${consoleBase}`);
  console.log(`API:     ${apiBase}`);
  console.log(`Pages:   ${PAGES.length} (+ /dashboard redirect)`);

  try {
    await waitForHttp(consoleBase);
    await waitForHttp(`${apiBase}/health`);
    console.log("  PASS  health.console + health.api");
  } catch (error) {
    console.error(`  FAIL  health: ${error}`);
    writeReport({
      passed: [],
      failed: [`health: ${String(error)}`],
      pages: [],
      summary: { total: PAGES.length, pass: 0, fail: PAGES.length },
      dashboard: null,
      generatedAt: new Date().toISOString(),
    });
    process.exitCode = 1;
    return;
  }

  let authMode = "api";
  let auth = null;
  try {
    auth = await loginViaApi();
    console.log(`  PASS  login.api ${email}`);
  } catch (apiErr) {
    console.log(`  NOTE  API login failed: ${apiErr}`);
    try {
      auth = await loginViaConsole();
      authMode = "console";
      console.log(`  PASS  login.console ${email}`);
    } catch (consoleErr) {
      console.log(`  NOTE  Console login failed: ${consoleErr}`);
      authMode = "preview";
      console.log("  NOTE  Using preview cookie auth");
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
  page.setDefaultTimeout(30_000);
  const pageErrors = [];
  page.on("pageerror", (err) => pageErrors.push(err.message));

  const dashboard = await checkDashboardRedirect(page);
  console.log(`\n[/dashboard] ${dashboard.ok ? "PASS" : "FAIL"} → ${dashboard.finalPath || dashboard.notes.join("; ")}`);

  const pages = [];
  for (const entry of PAGES) {
    console.log(`\n[${entry.order}] ${entry.path} (${entry.label})`);
    const result = await auditPage(page, entry);
    pages.push(result);
    const clickInfo = formatClickSummary(result.clicks);
    console.log(
      `  ${result.ok ? "PASS" : "FAIL"} display=${result.display} clicks=${clickInfo} title="${(result.title || "").slice(0, 40)}"`,
    );
    if (result.notes.length) {
      for (const n of result.notes) console.log(`  NOTE  ${n}`);
    }
    for (const c of result.clicks) {
      if (c.result !== "pass") console.log(`  CLICK ${c.result}: ${c.label} — ${c.detail || ""}`);
    }
  }

  await browser.close();

  const passed = [];
  const failed = [];
  for (const p of pages) {
    const clickPass = p.clicks.filter((c) => c.result === "pass").length;
    const clickFail = p.clicks.filter((c) => c.result === "fail").length;
    const tag = `${p.order}.${p.name}`;
    if (p.ok) {
      const parts = [];
      if (p.display === "pass") parts.push("display");
      if (clickFail === 0) parts.push(clickPass > 0 ? "clicks" : "clicks(none)");
      passed.push(`${tag}: ${parts.join("+")}`);
    } else {
      const reasons = [];
      if (p.display !== "pass") reasons.push(`display fail: ${p.notes.join("; ") || "unknown"}`);
      if (clickFail > 0) {
        reasons.push(
          `clicks fail: ${p.clicks
            .filter((c) => c.result === "fail")
            .map((c) => c.label)
            .join(", ")}`,
        );
      }
      failed.push(`${tag}: ${reasons.join(" | ") || p.notes.join("; ") || "unknown"}`);
    }
  }

  if (!dashboard.ok) {
    failed.unshift(`dashboard: ${dashboard.notes.join("; ")}`);
  } else {
    passed.unshift(`dashboard: redirect → ${dashboard.finalPath}`);
  }

  const summary = {
    total: PAGES.length,
    pass: pages.filter((p) => p.ok).length,
    fail: pages.filter((p) => !p.ok).length,
    dashboardOk: dashboard.ok,
  };

  const report = {
    passed,
    failed,
    pages: pages.map((p) => ({
      order: p.order,
      path: p.path,
      title: p.title,
      display: p.display,
      clicks: p.clicks.map((c) => ({
        label: c.label,
        result: c.result,
        ...(c.detail ? { detail: c.detail } : {}),
      })),
      notes: p.notes,
    })),
    summary,
    dashboard,
    authMode,
    generatedAt: new Date().toISOString(),
    pageErrors: pageErrors.slice(0, 20),
  };

  printTable(pages, dashboard);
  writeReport(report);
  console.log(`\nSummary: ${summary.pass}/${summary.total} pages passed, ${summary.fail} failed`);
  if (failed.length) {
    console.log("Failed:");
    for (const f of failed) console.log(`  - ${f}`);
  }
  if (summary.fail > 0 || !dashboard.ok) process.exitCode = 1;
}

run().catch((error) => {
  console.error("fatal", error);
  writeReport({
    passed: [],
    failed: [`fatal: ${String(error)}`],
    pages: [],
    summary: { total: PAGES.length, pass: 0, fail: PAGES.length },
    generatedAt: new Date().toISOString(),
  });
  process.exitCode = 1;
});
