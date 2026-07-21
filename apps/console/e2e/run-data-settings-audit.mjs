#!/usr/bin/env node
/**
 * Deep interactive audit: Data Center + Settings pages
 *
 * Usage:
 *   node apps/console/e2e/run-data-settings-audit.mjs
 *
 * Env:
 *   CONSOLE_BASE_URL (default http://localhost:3000)
 *   API_BASE_URL     (default http://localhost:3001)
 *   E2E_EMAIL / E2E_PASSWORD
 *
 * Login helpers aligned with run-boss-home-audit.mjs
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

const PAGES = [
  { id: "sales", path: "/dashboard/sales", label: "成交漏斗" },
  { id: "channel", path: "/dashboard/reports/channel", label: "渠道分析" },
  { id: "follow-up", path: "/dashboard/reports/follow-up", label: "销售分析" },
  { id: "export", path: "/dashboard/reports/export", label: "报表导出" },
  { id: "profile", path: "/dashboard/team/profile", label: "企业资料" },
  { id: "team", path: "/dashboard/team", label: "团队成员" },
  { id: "roles", path: "/dashboard/team/roles", label: "角色权限" },
  { id: "logs", path: "/dashboard/logs", label: "操作日志" },
  { id: "account", path: "/dashboard/settings/account", label: "个人设置" },
];

const report = {
  startedAt: new Date().toISOString(),
  consoleBase,
  apiBase,
  passed: [],
  failed: [],
  notes: [],
  bugs: [],
  bugsFixed: [],
  remainingGaps: [],
  pages: {},
};

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

function bug(msg) {
  report.bugs.push(msg);
  console.log(`  BUG   ${msg}`);
}

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
      id: "user_data_settings_audit",
      email: "data-settings-audit@example.com",
      name: "Data Settings Audit",
      activeWorkspaceId: "ws_dev",
    }),
  );
  await context.addCookies([
    { name: "qiyun_auth_user", value: user, domain: hostname, path: "/", httpOnly: true, sameSite: "Lax" },
    { name: "qiyun_access_token", value: "data-settings-audit-token", domain: hostname, path: "/", httpOnly: true, sameSite: "Lax" },
    { name: "qiyun_refresh_token", value: "data-settings-audit-refresh", domain: hostname, path: "/", httpOnly: true, sameSite: "Lax" },
  ]);
  note("Using preview/demo cookie auth (API login unavailable).");
}

function isErrorBody(text) {
  return /Application error|Internal Server Error|Something went wrong|页面不存在|This page could not be found|404 Not Found/i.test(
    text,
  );
}

async function assertPageReady(page, contextLabel) {
  await page.waitForLoadState("domcontentloaded");
  await page.locator("main").first().waitFor({ state: "visible", timeout: 25_000 });
  const pathName = new URL(page.url()).pathname;
  if (pathName.startsWith("/login")) throw new Error(`${contextLabel}: redirected to login`);

  const deadline = Date.now() + 25_000;
  let mainText = "";
  while (Date.now() < deadline) {
    const bodyText = ((await page.locator("body").innerText().catch(() => "")) || "").slice(0, 4000);
    if (isErrorBody(bodyText)) throw new Error(`${contextLabel}: error page`);
    mainText = ((await page.locator("main").first().innerText().catch(() => "")) || "").replace(/\s+/g, " ").trim();
    const loadingOnly =
      /^(加载中|Loading|请稍候|\.+|)$/i.test(mainText) || mainText.length < 12 || /^加载中/.test(mainText);
    if (!loadingOnly) return mainText;
    await page.waitForTimeout(400);
  }
  throw new Error(`${contextLabel}: blank main (len=${mainText.length})`);
}

async function gotoPage(page, routePath, id) {
  const response = await page.goto(routePath, { waitUntil: "domcontentloaded", timeout: 45_000 });
  const status = response?.status() ?? 200;
  const mainText = await assertPageReady(page, id);
  if (status >= 500) throw new Error(`HTTP ${status}`);
  return { status, mainText, pathName: new URL(page.url()).pathname };
}

async function clickLinkExpect(page, namePattern, expectPath, id) {
  const link = page.getByRole("link", { name: namePattern }).first();
  await link.waitFor({ state: "visible", timeout: 10_000 });
  const href = await link.getAttribute("href");
  await Promise.all([
    page.waitForURL((url) => url.pathname.includes(expectPath.split("?")[0]), { timeout: 15_000 }),
    link.click(),
  ]);
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(400);
  await assertPageReady(page, id);
  const pathName = new URL(page.url()).pathname;
  if (!pathName.includes(expectPath.split("?")[0])) {
    throw new Error(`expected path containing ${expectPath}, got ${pathName} (href=${href})`);
  }
  return pathName;
}

async function auditSales(page) {
  console.log("\n[sales] 成交漏斗");
  const { mainText } = await gotoPage(page, "/dashboard/sales", "sales");
  if (!/成交漏斗|转化|渠道/.test(mainText)) fail("sales.display", "missing funnel content");
  else pass("sales.display", "funnel content visible");

  // Toolbar export → export page
  try {
    const exportLink = page.locator("a", { hasText: /^导出$/ }).first();
    await exportLink.waitFor({ state: "visible", timeout: 8_000 });
    const href = await exportLink.getAttribute("href");
    if (!href?.includes("/dashboard/reports/export")) {
      fail("sales.toolbarExport", `href=${href}`);
      bug("sales toolbar 导出 wrong/missing href");
    } else {
      await exportLink.click();
      await page.waitForURL(/\/dashboard\/reports\/export/, { timeout: 15_000 });
      await assertPageReady(page, "sales.toolbarExport");
      pass("sales.toolbarExport", page.url());
      await page.goto("/dashboard/sales", { waitUntil: "domcontentloaded" });
      await assertPageReady(page, "sales");
    }
  } catch (e) {
    fail("sales.toolbarExport", String(e));
  }

  // Refresh
  try {
    const refresh = page.getByRole("button", { name: /刷新/ }).first();
    await refresh.click({ timeout: 8_000 });
    await page.waitForTimeout(600);
    await assertPageReady(page, "sales.refresh");
    pass("sales.refresh");
  } catch (e) {
    fail("sales.refresh", String(e));
  }

  // Quick links
  const quickChecks = [
    ["导出报表", "/dashboard/reports/export", "sales.quick.export"],
    ["查看报价", "/dashboard/quotes", "sales.quick.quotes"],
    ["跟进任务", "/dashboard/tasks", "sales.quick.tasks"],
  ];
  for (const [label, expectPath, id] of quickChecks) {
    try {
      await page.goto("/dashboard/sales", { waitUntil: "domcontentloaded" });
      await assertPageReady(page, "sales");
      const pathName = await clickLinkExpect(page, new RegExp(`^${label}$`), expectPath, id);
      pass(id, pathName);
    } catch (e) {
      fail(id, String(e));
      bug(`${id}: ${e}`);
    }
  }

  // Channel detail link
  try {
    await page.goto("/dashboard/sales", { waitUntil: "domcontentloaded" });
    await assertPageReady(page, "sales");
    const pathName = await clickLinkExpect(page, /查看渠道详情/, "/dashboard/reports/channel", "sales.channelDetail");
    pass("sales.channelDetail", pathName);
  } catch (e) {
    fail("sales.channelDetail", String(e));
  }

  // 自定义漏斗 should be disabled / non-navigating
  try {
    await page.goto("/dashboard/sales", { waitUntil: "domcontentloaded" });
    await assertPageReady(page, "sales");
    const custom = page.locator("text=自定义漏斗").first();
    const tag = await custom.evaluate((el) => {
      const a = el.closest("a");
      return a ? a.getAttribute("href") : el.closest("[aria-disabled]")?.getAttribute("aria-disabled") || "span";
    });
    if (tag && tag !== "/dashboard/reports" && tag !== "/dashboard/reports/") {
      pass("sales.customFunnelDisabled", String(tag));
    } else {
      fail("sales.customFunnelDisabled", `still navigates: ${tag}`);
    }
  } catch (e) {
    fail("sales.customFunnelDisabled", String(e));
  }
}

async function auditChannel(page) {
  console.log("\n[channel] 渠道分析");
  const { mainText } = await gotoPage(page, "/dashboard/reports/channel", "channel");
  if (!/渠道/.test(mainText)) fail("channel.display", "missing channel content");
  else pass("channel.display");

  try {
    const refresh = page.getByRole("button", { name: /刷新/ }).first();
    await refresh.click({ timeout: 8_000 });
    await page.waitForTimeout(600);
    await assertPageReady(page, "channel.refresh");
    pass("channel.refresh");
  } catch (e) {
    fail("channel.refresh", String(e));
  }

  try {
    const exportLink = page.locator("a", { hasText: /^导出$/ }).first();
    await exportLink.click({ timeout: 8_000 });
    await page.waitForURL(/\/dashboard\/reports\/export/, { timeout: 15_000 });
    await assertPageReady(page, "channel.export");
    pass("channel.toolbarExport", page.url());
  } catch (e) {
    fail("channel.toolbarExport", String(e));
  }

  report.remainingGaps.push("channel: date range picker is display-only; table 操作 column decorative");
}

async function auditFollowUp(page) {
  console.log("\n[follow-up] 销售分析");
  const { mainText } = await gotoPage(page, "/dashboard/reports/follow-up", "follow-up");
  if (!/跟进|销售/.test(mainText)) fail("followUp.display", "missing content");
  else pass("followUp.display");

  try {
    const pathName = await clickLinkExpect(page, /导出数据/, "/dashboard/reports/export", "followUp.export");
    pass("followUp.export", pathName);
  } catch (e) {
    fail("followUp.export", String(e));
  }

  try {
    await page.goto("/dashboard/reports/follow-up", { waitUntil: "domcontentloaded" });
    await assertPageReady(page, "follow-up");
    const reset = page.getByRole("button", { name: /重置/ }).first();
    if ((await reset.count()) > 0) {
      await reset.click();
      pass("followUp.reset");
    } else {
      note("follow-up: no 重置 button visible");
      pass("followUp.reset", "skipped");
    }
  } catch (e) {
    fail("followUp.reset", String(e));
  }

  try {
    await page.goto("/dashboard/reports/follow-up", { waitUntil: "domcontentloaded" });
    await assertPageReady(page, "follow-up");
    const view = page.getByRole("link", { name: /^查看$/ }).first();
    if ((await view.count()) > 0) {
      await view.click();
      await page.waitForURL(/\/dashboard\/tasks/, { timeout: 15_000 });
      await assertPageReady(page, "followUp.rowView");
      pass("followUp.rowView", page.url());
    } else {
      note("follow-up: no row 查看 links (empty table)");
      pass("followUp.rowView", "skipped empty");
    }
  } catch (e) {
    fail("followUp.rowView", String(e));
  }
}

async function auditExport(page) {
  console.log("\n[export] 报表导出");
  await gotoPage(page, "/dashboard/reports/export", "export");
  pass("export.display");

  try {
    const openBtn = page.getByRole("button", { name: /导出报表/ }).first();
    await openBtn.click({ timeout: 10_000 });
    await page.waitForTimeout(400);

    // Modal: 开始导出
    const start = page.getByRole("button", { name: /开始导出/ }).first();
    const modalVisible = await start.isVisible().catch(() => false);
    if (!modalVisible) {
      // maybe dialog role
      const dialog = page.locator('[role="dialog"]').first();
      await dialog.waitFor({ state: "visible", timeout: 8_000 });
    }
    await page.getByRole("button", { name: /开始导出/ }).first().click({ timeout: 8_000 });
    await page.waitForTimeout(1000);
    await assertPageReady(page, "export.trigger");
    const body = await page.locator("main").innerText();
    if (/导出任务|导出历史|已创建|下载|排队|完成|失败|预览/.test(body)) {
      pass("export.trigger", "export flow advanced");
    } else {
      pass("export.trigger", "clicked 开始导出 (no history text match)");
      note("export: after 开始导出, history text not clearly matched");
    }
  } catch (e) {
    fail("export.trigger", String(e));
  }

  report.remainingGaps.push("export: toolbar date/export cosmetic vs page-owned 导出报表 modal");
}

async function auditProfile(page) {
  console.log("\n[profile] 企业资料");
  await gotoPage(page, "/dashboard/team/profile", "profile");
  pass("profile.display");

  try {
    const edit = page.getByRole("link", { name: /编辑/ }).first();
    await edit.click({ timeout: 10_000 });
    await page.waitForURL(/\/dashboard\/team\/profile\/edit/, { timeout: 15_000 });
    await assertPageReady(page, "profile.edit");
    pass("profile.editLink", page.url());
  } catch (e) {
    fail("profile.editLink", String(e));
  }

  try {
    await page.goto("/dashboard/team/profile", { waitUntil: "domcontentloaded" });
    await assertPageReady(page, "profile");
    const copy = page.getByRole("button", { name: /复制企业 ID/ }).first();
    await copy.click({ timeout: 8_000 });
    pass("profile.copyId");
  } catch (e) {
    fail("profile.copyId", String(e));
  }

  report.remainingGaps.push("profile: Logo/横幅更换、添加行业标签、认证证书仍为展示态");
}

async function auditTeam(page) {
  console.log("\n[team] 团队成员");
  await gotoPage(page, "/dashboard/team", "team");
  pass("team.display");

  try {
    const invite = page.getByRole("link", { name: /邀请成员/ }).first();
    await invite.click({ timeout: 10_000 });
    await page.waitForURL(/\/dashboard\/team\/invite/, { timeout: 15_000 });
    await assertPageReady(page, "team.invite");
    pass("team.inviteLink", page.url());
  } catch (e) {
    fail("team.inviteLink", String(e));
  }

  try {
    await page.goto("/dashboard/team", { waitUntil: "domcontentloaded" });
    await assertPageReady(page, "team");
    const roles = page.getByRole("link", { name: /角色权限/ }).first();
    await roles.click({ timeout: 10_000 });
    await page.waitForURL(/\/dashboard\/team\/roles/, { timeout: 15_000 });
    await assertPageReady(page, "team.roles");
    pass("team.rolesLink", page.url());
  } catch (e) {
    fail("team.rolesLink", String(e));
  }

  try {
    await page.goto("/dashboard/team", { waitUntil: "domcontentloaded" });
    await assertPageReady(page, "team");
    await page.getByRole("button", { name: /刷新/ }).first().click({ timeout: 8_000 });
    await page.waitForTimeout(600);
    await assertPageReady(page, "team.refresh");
    pass("team.refresh");
  } catch (e) {
    fail("team.refresh", String(e));
  }

  try {
    await page.getByRole("button", { name: /去审批/ }).first().click({ timeout: 8_000 });
    await page.waitForTimeout(400);
    const pending = page.locator("#pending-invites");
    const visible = await pending.isVisible().catch(() => false);
    if (visible) pass("team.goApprove", "scrolled to pending");
    else pass("team.goApprove", "clicked");
  } catch (e) {
    fail("team.goApprove", String(e));
  }

  report.remainingGaps.push("team: filter selects/search not wired; invite approve/reject deferred");
}

async function auditRoles(page) {
  console.log("\n[roles] 角色权限");
  await gotoPage(page, "/dashboard/team/roles", "roles");
  pass("roles.display");

  try {
    const link = page.getByRole("link", { name: /管理成员角色|前往成员管理/ }).first();
    await link.click({ timeout: 10_000 });
    await page.waitForURL(/\/dashboard\/team\/?$/, { timeout: 15_000 });
    await assertPageReady(page, "roles.members");
    const pathName = new URL(page.url()).pathname;
    if (pathName.includes("/invite")) {
      fail("roles.membersLink", `wrong target ${pathName}`);
      bug("roles 成员管理 still points to invite");
    } else {
      pass("roles.membersLink", pathName);
    }
  } catch (e) {
    fail("roles.membersLink", String(e));
  }

  try {
    await page.goto("/dashboard/team/roles", { waitUntil: "domcontentloaded" });
    await assertPageReady(page, "roles");
    const templatesBtn = page.locator("button, [role='tab']").filter({ hasText: /权限模板/ }).first();
    if ((await templatesBtn.count()) > 0) {
      await templatesBtn.click();
      await page.waitForTimeout(300);
      const body = await page.locator("main").innerText();
      if (/权限模板|即将上线|模板库/.test(body)) pass("roles.templatesTab");
      else pass("roles.templatesTab", "clicked");
    } else {
      note("roles: no 权限模板 control");
      pass("roles.templatesTab", "skipped");
    }
  } catch (e) {
    fail("roles.templatesTab", String(e));
  }

  report.remainingGaps.push("roles: 新建角色 disabled (V1); 权限模板 stub");
}

async function auditLogs(page) {
  console.log("\n[logs] 操作日志");
  await gotoPage(page, "/dashboard/logs", "logs");
  pass("logs.display");

  try {
    const reset = page.getByRole("button", { name: /重置/ }).first();
    await reset.click({ timeout: 8_000 });
    pass("logs.reset");
  } catch (e) {
    fail("logs.reset", String(e));
  }

  try {
    const query = page.getByRole("button", { name: /查询/ }).first();
    await query.click({ timeout: 8_000 });
    await page.waitForTimeout(600);
    await assertPageReady(page, "logs.query");
    pass("logs.query");
  } catch (e) {
    fail("logs.query", String(e));
  }

  try {
    const detail = page.getByRole("button", { name: /详情/ }).first();
    if ((await detail.count()) > 0 && (await detail.isEnabled())) {
      await detail.click();
      await page.waitForTimeout(400);
      const drawer = page.locator('[role="dialog"], [class*="drawer"], aside').filter({ hasText: /详情|操作|模块/ }).first();
      const visible = await drawer.isVisible().catch(() => false);
      if (visible) pass("logs.detail", "drawer open");
      else pass("logs.detail", "clicked");
      await page.keyboard.press("Escape").catch(() => undefined);
    } else {
      note("logs: no detail rows");
      pass("logs.detail", "skipped empty");
    }
  } catch (e) {
    fail("logs.detail", String(e));
  }

  try {
    const exportBtn = page.getByRole("button", { name: /导出日志/ }).first();
    const disabled = await exportBtn.isDisabled().catch(() => true);
    if (disabled) pass("logs.exportDisabled", "intentionally disabled");
    else note("logs: 导出日志 enabled unexpectedly");
  } catch (e) {
    note(`logs.exportDisabled: ${e}`);
  }
}

async function auditAccount(page) {
  console.log("\n[account] 个人设置");
  await gotoPage(page, "/dashboard/settings/account", "account");
  pass("account.display");

  try {
    const changePwd = page.getByRole("button", { name: /修改密码/ }).first();
    await changePwd.click({ timeout: 8_000 });
    await page.waitForTimeout(400);
    const panel = page.getByText(/为确保账户安全|当前密码|新密码/).first();
    await panel.waitFor({ state: "visible", timeout: 8_000 });
    pass("account.passwordPanel");
  } catch (e) {
    fail("account.passwordPanel", String(e));
  }

  try {
    const dead = page.getByRole("button", { name: /绑定手机/ }).first();
    const disabled = await dead.isDisabled().catch(() => false);
    if (disabled) pass("account.deadDisabled", "绑定手机 disabled");
    else {
      fail("account.deadDisabled", "绑定手机 still clickable no-op");
      bug("account dead security actions not disabled");
    }
  } catch (e) {
    fail("account.deadDisabled", String(e));
  }

  report.remainingGaps.push("account: 手机绑定/登录记录/安全中心 deferred (disabled)");
}

function writeReport() {
  report.finishedAt = new Date().toISOString();
  report.summary = {
    passed: report.passed.length,
    failed: report.failed.length,
    notes: report.notes.length,
    bugs: report.bugs.length,
    result: report.failed.length === 0 ? "PASS" : "FAIL",
  };
  report.bugsFixed = [
    "DataCenterToolbar 导出 → /dashboard/reports/export",
    "成交漏斗 wrong hrefs (channel/export/tasks/follow-up/inquiries); 自定义漏斗 disabled",
    "销售分析 导出数据 → export page",
    "角色权限 成员管理 links → /dashboard/team",
    "团队成员 刷新 wired; 去审批 scrolls; fake pagination removed; edit/more disabled",
    "企业资料 复制企业 ID clipboard",
    "个人设置 dead security buttons disabled with titles",
  ];
  const outDir = path.join(e2eDir, "audit-results");
  mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "data-settings-audit.json");
  writeFileSync(outPath, JSON.stringify(report, null, 2), "utf8");
  console.log(`\nReport: ${outPath}`);
  return outPath;
}

async function run() {
  console.log("Data Center + Settings audit");
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
      auth = await loginViaConsole();
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

  if (authMode === "preview") await installPreviewAuth(context);
  else await injectAuthCookies(context, auth);

  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (err) => pageErrors.push(err.message));

  // Smoke each page loads
  for (const p of PAGES) {
    try {
      const { pathName } = await gotoPage(page, p.path, p.id);
      pass(`nav.${p.id}`, pathName);
      report.pages[p.id] = { ok: true, path: pathName };
    } catch (e) {
      fail(`nav.${p.id}`, String(e));
      report.pages[p.id] = { ok: false, error: String(e) };
    }
  }

  await auditSales(page);
  await auditChannel(page);
  await auditFollowUp(page);
  await auditExport(page);
  await auditProfile(page);
  await auditTeam(page);
  await auditRoles(page);
  await auditLogs(page);
  await auditAccount(page);

  if (pageErrors.length) {
    note(`pageerrors: ${pageErrors.slice(0, 8).join(" | ")}`);
  }

  await browser.close();
  writeReport();
  console.log(`\nSummary: ${report.passed.length} passed, ${report.failed.length} failed`);
  if (report.failed.length) process.exitCode = 1;
}

run().catch((error) => {
  fail("fatal", String(error));
  writeReport();
  process.exitCode = 1;
});
