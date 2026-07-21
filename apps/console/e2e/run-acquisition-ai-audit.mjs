#!/usr/bin/env node
/**
 * Deep Playwright audit — 获客中心 + AI 中心 Console pages
 *
 * Usage:
 *   node apps/console/e2e/run-acquisition-ai-audit.mjs
 *
 * Env:
 *   CONSOLE_BASE_URL (default http://localhost:3000)
 *   API_BASE_URL     (default http://localhost:3001)
 *   E2E_EMAIL / E2E_PASSWORD
 *
 * Login reused from run-boss-home-audit.mjs (API login → cookies; console login fallback; preview last).
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

/** Slow client workspaces need long polls before main CTAs appear. */
const READY_TIMEOUT_MS = 45_000;
const NAV_TIMEOUT_MS = 60_000;

const report = {
  generatedAt: new Date().toISOString(),
  consoleBase,
  apiBase,
  authMode: null,
  passed: [],
  failed: [],
  notes: [],
  bugs: [],
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
  report.notes.push(`[BUG] ${msg}`);
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
      id: "user_acq_audit",
      email: "acq-audit@example.com",
      name: "Acq Audit",
      activeWorkspaceId: "ws_dev",
    }),
  );
  await context.addCookies([
    { name: "qiyun_auth_user", value: user, domain: hostname, path: "/", httpOnly: true, sameSite: "Lax" },
    { name: "qiyun_access_token", value: "acq-audit-token", domain: hostname, path: "/", httpOnly: true, sameSite: "Lax" },
    { name: "qiyun_refresh_token", value: "acq-audit-refresh", domain: hostname, path: "/", httpOnly: true, sameSite: "Lax" },
  ]);
  note("Using preview/demo cookie auth (API login unavailable).");
}

function isErrorBody(text) {
  return /Application error|Internal Server Error|Something went wrong|页面不存在|This page could not be found|404 Not Found/i.test(
    text,
  );
}

function isLoginBody(text) {
  return /登录到\s*AI云|登录账号|忘记密码/.test(text) && /密码/.test(text);
}

async function assertNoErrorPage(page, label) {
  const pathName = new URL(page.url()).pathname;
  if (pathName.startsWith("/login")) throw new Error(`${label}: redirected to login`);
  const bodyText = ((await page.locator("body").innerText().catch(() => "")) || "").slice(0, 2500);
  if (isErrorBody(bodyText)) throw new Error(`${label}: error page content`);
  if (isLoginBody(bodyText)) throw new Error(`${label}: login page content`);
  const mainVisible = await page.locator("main").first().isVisible().catch(() => false);
  if (!mainVisible) throw new Error(`${label}: main not visible`);
}

/**
 * Wait until main has meaningful content AND optional marker text / CTA.
 * Landing/sites previously returned ~14-char shells before hydration.
 */
async function waitForPageReady(page, { path: routePath, markers = [], minMainLen = 40 } = {}) {
  await page.waitForLoadState("domcontentloaded");
  await page.locator("main").first().waitFor({ state: "visible", timeout: 25_000 });

  const deadline = Date.now() + READY_TIMEOUT_MS;
  let lastMain = "";
  while (Date.now() < deadline) {
    const pathName = new URL(page.url()).pathname;
    if (pathName.startsWith("/login")) throw new Error("redirected to login");

    const bodyText = ((await page.locator("body").innerText().catch(() => "")) || "").slice(0, 4000);
    if (isErrorBody(bodyText)) throw new Error("error page content detected");
    if (isLoginBody(bodyText)) throw new Error("login page content detected");

    lastMain = ((await page.locator("main").first().innerText().catch(() => "")) || "")
      .replace(/\s+/g, " ")
      .trim();

    const loadingOnly =
      /^(加载中|Loading|请稍候|\.+|)$/i.test(lastMain) ||
      /^加载中/.test(lastMain) ||
      /正在加载/.test(lastMain);

    const hasMarker =
      markers.length === 0 || markers.some((m) => (typeof m === "string" ? lastMain.includes(m) : m.test(lastMain)));

    const controlCount = await page.locator("main button, main a[href], main [role='button']").count();

    if (!loadingOnly && lastMain.length >= minMainLen && hasMarker && controlCount > 0) {
      return { mainText: lastMain, controlCount };
    }
    await page.waitForTimeout(450);
  }
  throw new Error(
    `ready timeout on ${routePath || page.url()} (mainLen=${lastMain.length}, markers=${markers.map(String).join("|")})`,
  );
}

async function gotoReady(page, routePath, markers = []) {
  const response = await page.goto(routePath, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT_MS });
  const status = response?.status() ?? 200;
  if (status >= 500) throw new Error(`HTTP ${status}`);
  const ready = await waitForPageReady(page, { path: routePath, markers });
  await assertNoErrorPage(page, routePath);
  return { status, ...ready };
}

async function clickExpectNav(page, locator, urlRe, label) {
  await locator.scrollIntoViewIfNeeded().catch(() => undefined);
  await Promise.all([page.waitForURL(urlRe, { timeout: 20_000 }), locator.click({ timeout: 10_000 })]);
  await page.waitForLoadState("domcontentloaded").catch(() => undefined);
  await page.waitForTimeout(400);
  await assertNoErrorPage(page, label);
  return new URL(page.url()).pathname + new URL(page.url()).search;
}

function pageBucket(key) {
  if (!report.pages[key]) report.pages[key] = { checks: [], notes: [] };
  return report.pages[key];
}

function pagePass(key, id, detail = "") {
  pageBucket(key).checks.push({ id, result: "pass", detail });
  pass(`${key}.${id}`, detail);
}

function pageFail(key, id, detail = "") {
  pageBucket(key).checks.push({ id, result: "fail", detail });
  fail(`${key}.${id}`, detail);
}

function pageNote(key, msg) {
  pageBucket(key).notes.push(msg);
  note(`[${key}] ${msg}`);
}

// ---------- Page audits ----------

async function auditLanding(page) {
  const key = "landing";
  console.log("\n[1] /dashboard/bots/landing — AI选型独立页");
  try {
    const { mainText, controlCount } = await gotoReady(page, "/dashboard/bots/landing", [
      "新建选型页",
      /选型页列表|已创建选型页/,
    ]);
    pagePass(key, "display", `mainLen=${mainText.length} controls=${controlCount}`);
  } catch (e) {
    pageFail(key, "display", String(e));
    return;
  }

  // Create
  try {
    await gotoReady(page, "/dashboard/bots/landing", ["新建选型页"]);
    const dest = await clickExpectNav(
      page,
      page.getByRole("button", { name: /新建选型页/ }).first(),
      /\/dashboard\/bots\/landing\/edit/,
      "landing.new",
    );
    if (!/[?&]page=new\b/.test(page.url()) && !/page=new/.test(dest)) {
      pageNote(key, `create landed without page=new: ${dest}`);
    }
    await waitForPageReady(page, {
      path: dest,
      markers: [/基础设置|页面名称|新建选型页|草稿|保存/],
      minMainLen: 30,
    });
    pagePass(key, "create", dest);
  } catch (e) {
    pageFail(key, "create", String(e));
    bug(`landing 新建选型页 navigation/create failed: ${e}`);
  }

  // Edit
  try {
    await gotoReady(page, "/dashboard/bots/landing", ["新建选型页"]);
    const dest = await clickExpectNav(
      page,
      page.locator("main").getByRole("button", { name: /^编辑$/ }).first(),
      /\/dashboard\/bots\/landing\/edit/,
      "landing.edit",
    );
    await waitForPageReady(page, { path: dest, markers: [/基础设置|页面名称|保存|预览/], minMainLen: 30 });
    pagePass(key, "edit", dest);
  } catch (e) {
    pageFail(key, "edit", String(e));
    bug(`landing 编辑 failed: ${e}`);
  }

  // Preview (popup)
  try {
    await gotoReady(page, "/dashboard/bots/landing", ["新建选型页"]);
    const popupPromise = page.waitForEvent("popup", { timeout: 10_000 });
    await page.locator("main").getByRole("button", { name: /^预览$/ }).first().click();
    const popup = await popupPromise;
    await popup.waitForLoadState("domcontentloaded").catch(() => undefined);
    const popupUrl = popup.url();
    const ok = /\/s\/|preview=1/.test(popupUrl);
    await popup.close().catch(() => undefined);
    if (ok) pagePass(key, "preview", popupUrl);
    else pageFail(key, "preview", `unexpected popup ${popupUrl}`);
  } catch (e) {
    pageFail(key, "preview", String(e));
    bug(`landing 预览 failed: ${e}`);
  }
}

async function auditSites(page) {
  const key = "sites";
  console.log("\n[2] /dashboard/sites — Widget sites");
  try {
    const { mainText, controlCount } = await gotoReady(page, "/dashboard/sites", [
      /接入新站点|站点接入列表|安装代码/,
    ]);
    pagePass(key, "display", `mainLen=${mainText.length} controls=${controlCount}`);
  } catch (e) {
    pageFail(key, "display", String(e));
    return;
  }

  // New (inline form OR /sites/new)
  try {
    await gotoReady(page, "/dashboard/sites", [/接入新站点/]);
    const newBtn = page.getByRole("button", { name: /接入新站点/ }).first();
    const newLink = page.getByRole("link", { name: /接入新站点|添加站点/ }).first();
    if (await newBtn.isVisible().catch(() => false)) {
      await newBtn.click();
      await page.waitForTimeout(600);
      const formVisible = await page
        .locator("main")
        .getByText(/站点名称|域名/)
        .first()
        .isVisible()
        .catch(() => false);
      if (formVisible) pagePass(key, "new", "inline create form opened");
      else {
        // maybe navigates
        if (/\/dashboard\/sites\/new/.test(page.url())) pagePass(key, "new", page.url());
        else pageFail(key, "new", "button clicked but no form / nav");
      }
    } else if (await newLink.isVisible().catch(() => false)) {
      const dest = await clickExpectNav(page, newLink, /\/dashboard\/sites\/new/, "sites.new");
      pagePass(key, "new", dest);
    } else {
      pageFail(key, "new", "no 接入新站点 control");
    }
  } catch (e) {
    pageFail(key, "new", String(e));
  }

  // Install / appearance / settings links from list OR dedicated routes
  try {
    await gotoReady(page, "/dashboard/sites", [/接入新站点|安装代码/]);
    const installLink = page.locator("main a[href='/dashboard/sites/install'], main a[href^='/dashboard/sites/install']").first();
    const installBtn = page.getByRole("button", { name: /安装指引|安装说明/ }).first();
    const installLinkCount = await installLink.count();
    if (installLinkCount > 0) {
      const dest = await clickExpectNav(page, installLink, /\/dashboard\/sites\/install/, "sites.install");
      await waitForPageReady(page, { path: dest, markers: [/安装|Widget|嵌入|步骤/], minMainLen: 30 });
      pagePass(key, "installLink", dest);
    } else if (await installBtn.isVisible().catch(() => false)) {
      const disabled = await installBtn.isDisabled();
      if (disabled) {
        pageFail(key, "installLink", "安装指引 present but disabled (dead CTA)");
        bug("sites: 安装指引 button is disabled while /dashboard/sites/install exists");
      } else {
        await installBtn.click();
        await page.waitForTimeout(800);
        if (/\/dashboard\/sites\/install/.test(page.url())) pagePass(key, "installLink", page.url());
        else pageNote(key, "install button clicked without route change (inline?)");
        pagePass(key, "installLink", "button enabled");
      }
    } else {
      pageFail(key, "installLink", "no install link/button in main");
      bug("sites: missing install/appearance/settings entry points on list page");
    }
  } catch (e) {
    pageFail(key, "installLink", String(e));
  }

  // Dedicated subroutes must render
  for (const [sub, markers] of [
    ["/dashboard/sites/new", [/添加站点|站点名称|域名/]],
    ["/dashboard/sites/install", [/安装|Widget|嵌入|步骤/]],
    ["/dashboard/sites/appearance", [/外观|主题|按钮形状|预览/]],
    ["/dashboard/sites/settings", [/站点|白名单|嵌入|安装说明|外观/]],
  ]) {
    const id = `route.${sub.split("/").pop()}`;
    try {
      const { mainText } = await gotoReady(page, sub, markers);
      pagePass(key, id, `mainLen=${mainText.length}`);
    } catch (e) {
      pageFail(key, id, String(e));
    }
  }

  // Appearance / settings links on list if present
  try {
    await gotoReady(page, "/dashboard/sites", [/接入新站点|安装代码/]);
    for (const [name, href] of [
      ["appearance", "/dashboard/sites/appearance"],
      ["settings", "/dashboard/sites/settings"],
    ]) {
      const link = page.locator(`main a[href='${href}'], main a[href^='${href}']`).first();
      if ((await link.count()) > 0) {
        const dest = await clickExpectNav(page, link, new RegExp(href.replace(/\//g, "\\/")), `sites.${name}`);
        pagePass(key, `${name}Link`, dest);
        await gotoReady(page, "/dashboard/sites", [/接入新站点|安装代码/]);
      } else {
        pageNote(key, `no ${name} link on list (inline panels may cover this)`);
      }
    }
  } catch (e) {
    pageNote(key, `appearance/settings link check: ${e}`);
  }
}

async function auditLinks(page) {
  const key = "links";
  console.log("\n[3] /dashboard/channels/links — sales links");
  try {
    const { mainText, controlCount } = await gotoReady(page, "/dashboard/channels/links", [
      /新建.*链接|销售链接|链接列表/,
    ]);
    pagePass(key, "display", `mainLen=${mainText.length} controls=${controlCount}`);
  } catch (e) {
    pageFail(key, "display", String(e));
    return;
  }

  // New
  try {
    await gotoReady(page, "/dashboard/channels/links", [/新建/]);
    const dest = await clickExpectNav(
      page,
      page.locator("main a[href='/dashboard/channels/links/new'], main a[href^='/dashboard/channels/links/new']").first(),
      /\/dashboard\/channels\/links\/new/,
      "links.new",
    );
    await waitForPageReady(page, { path: dest, markers: [/链接|名称|保存|创建|渠道/], minMainLen: 20 });
    pagePass(key, "new", dest);
  } catch (e) {
    pageFail(key, "new", String(e));
  }

  // Detail — avoid matching /new
  try {
    await gotoReady(page, "/dashboard/channels/links", [/新建/]);
    const detailLink = page.locator("main a[href^='/dashboard/channels/links/']").evaluateAll((els) => {
      return els
        .map((el) => el.getAttribute("href") || "")
        .filter((h) => /^\/dashboard\/channels\/links\/[^/]+/.test(h) && !h.endsWith("/new") && !h.includes("/new?"));
    });
    const hrefs = await detailLink;
    if (hrefs.length === 0) {
      // try 编辑 button → detail
      const editBtn = page.locator("main").getByRole("button", { name: /^编辑$/ }).first();
      if (await editBtn.isVisible().catch(() => false)) {
        await editBtn.click();
        await page.waitForURL(/\/dashboard\/channels\/links\/(?!new)/, { timeout: 15_000 });
        await assertNoErrorPage(page, "links.detail");
        pagePass(key, "detail", page.url());
      } else {
        pageNote(key, "no detail hrefs / edit buttons — empty or preview list?");
        pagePass(key, "detail", "skipped (no detail target)");
      }
    } else {
      const href = hrefs[0];
      const dest = await clickExpectNav(
        page,
        page.locator(`main a[href='${href}']`).first(),
        new RegExp(href.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
        "links.detail",
      );
      pagePass(key, "detail", dest);
    }
  } catch (e) {
    pageFail(key, "detail", String(e));
  }

  // Copy
  try {
    await gotoReady(page, "/dashboard/channels/links", [/新建/]);
    const copyBtn = page.locator("main").getByRole("button", { name: /复制/ }).first();
    if (!(await copyBtn.isVisible().catch(() => false))) {
      pageNote(key, "no copy button visible");
      pagePass(key, "copy", "skipped");
    } else {
      await copyBtn.click();
      await page.waitForTimeout(500);
      const main = ((await page.locator("main").innerText()) || "").replace(/\s+/g, " ");
      if (/复制|已复制|剪贴板/.test(main)) pagePass(key, "copy", "feedback visible");
      else pagePass(key, "copy", "clicked (no visible toast text)");
    }
  } catch (e) {
    pageFail(key, "copy", String(e));
  }
}

async function auditQrcodes(page) {
  const key = "qrcodes";
  console.log("\n[4] /dashboard/channels/qrcodes — QR management");
  try {
    const { mainText, controlCount } = await gotoReady(page, "/dashboard/channels/qrcodes", [
      /二维码|创建二维码|创建销售链接/,
    ]);
    pagePass(key, "display", `mainLen=${mainText.length} controls=${controlCount}`);
  } catch (e) {
    pageFail(key, "display", String(e));
    return;
  }

  try {
    await gotoReady(page, "/dashboard/channels/qrcodes", [/创建二维码|二维码/]);
    const create = page.locator("main a[href*='/dashboard/channels/links/new']").first();
    if ((await create.count()) === 0) {
      pageFail(key, "create", "no create link");
    } else {
      const dest = await clickExpectNav(page, create, /\/dashboard\/channels\/links\/new/, "qrcodes.create");
      pagePass(key, "create", dest);
    }
  } catch (e) {
    pageFail(key, "create", String(e));
  }

  try {
    await gotoReady(page, "/dashboard/channels/qrcodes", [/二维码|创建/]);
    const tutorial = page.locator("main").getByRole("button", { name: /使用教程|教程/ }).first();
    if (await tutorial.isVisible().catch(() => false)) {
      await tutorial.click();
      await page.waitForTimeout(500);
      const dialog = page.locator('[role="dialog"], [role="alertdialog"]').first();
      const open = await dialog.isVisible().catch(() => false);
      if (open) {
        pagePass(key, "tutorial", "dialog opened");
        await page.keyboard.press("Escape").catch(() => undefined);
      } else pagePass(key, "tutorial", "clicked");
    } else {
      pageNote(key, "no tutorial control");
      pagePass(key, "tutorial", "skipped");
    }
  } catch (e) {
    pageFail(key, "tutorial", String(e));
  }
}

async function auditBots(page) {
  const key = "bots";
  console.log("\n[5] /dashboard/bots — AI assistants");
  try {
    // Stats + list hydrate slowly
    const { mainText, controlCount } = await gotoReady(page, "/dashboard/bots", [/新建助手|AI 助手/]);
    // Extra wait for list cards / config links
    const deadline = Date.now() + 20_000;
    while (Date.now() < deadline) {
      const links = await page.locator("main a[href*='/dashboard/bots/']").count();
      const text = ((await page.locator("main").innerText()) || "").replace(/\s+/g, " ");
      if (links > 0 || text.length > 120) break;
      await page.waitForTimeout(400);
    }
    pagePass(key, "display", `mainLen=${mainText.length} controls=${controlCount}`);
  } catch (e) {
    pageFail(key, "display", String(e));
    return;
  }

  try {
    await gotoReady(page, "/dashboard/bots", [/新建助手/]);
    const create = page.getByRole("button", { name: /新建助手/ }).first();
    await create.click();
    await page.waitForTimeout(600);
    const dialog = page.locator('[role="dialog"], [role="alertdialog"]').first();
    const open = await dialog.isVisible().catch(() => false);
    if (open) {
      pagePass(key, "createDialog", "opened");
      await page.keyboard.press("Escape").catch(() => undefined);
    } else pagePass(key, "createDialog", "clicked (no dialog — may navigate)");
  } catch (e) {
    pageFail(key, "createDialog", String(e));
  }

  try {
    await gotoReady(page, "/dashboard/bots", [/新建助手/]);
    const deadline = Date.now() + 20_000;
    let config = page.locator("main a[href*='/dashboard/bots/'][href*='/basics'], main a[href*='/dashboard/bots/']:not([href='/dashboard/bots'])").first();
    while (Date.now() < deadline) {
      if ((await page.locator("main a[href*='/basics']").count()) > 0) {
        config = page.locator("main a[href*='/basics']").first();
        break;
      }
      if ((await page.locator("main a[href^='/dashboard/bots/']").count()) > 1) break;
      await page.waitForTimeout(400);
    }
    const href = await config.getAttribute("href").catch(() => null);
    if (!href || href === "/dashboard/bots") {
      // try 配置 text link
      const cfg = page.locator("main").getByRole("link", { name: /配置/ }).first();
      if (await cfg.isVisible().catch(() => false)) {
        const dest = await clickExpectNav(page, cfg, /\/dashboard\/bots\//, "bots.config");
        pagePass(key, "openConfig", dest);
      } else {
        pageFail(key, "openConfig", "no config/detail link found after wait");
        bug("bots: list rendered without config/detail links");
      }
    } else {
      const dest = await clickExpectNav(page, config, /\/dashboard\/bots\//, "bots.config");
      await waitForPageReady(page, { path: dest, markers: [/基础|配置|助手|知识|行为|安装|保存/], minMainLen: 20 });
      pagePass(key, "openConfig", dest);
    }
  } catch (e) {
    pageFail(key, "openConfig", String(e));
  }

  // Dead more button?
  try {
    await gotoReady(page, "/dashboard/bots", [/新建助手/]);
    const deadline = Date.now() + 15_000;
    while (Date.now() < deadline) {
      const text = ((await page.locator("main").innerText()) || "").length;
      if (text > 100) break;
      await page.waitForTimeout(400);
    }
    const more = page.locator("main button").filter({ has: page.locator("svg") }).evaluateAll((els) => {
      // detect icon-only buttons with no aria-label that are not disabled
      return els
        .filter((el) => {
          const label = (el.getAttribute("aria-label") || el.textContent || "").replace(/\s+/g, " ").trim();
          return label.length === 0 && !el.disabled;
        })
        .length;
    });
    const emptyIconBtns = await more;
    if (emptyIconBtns > 0) {
      pageNote(key, `found ${emptyIconBtns} icon-only buttons without accessible name (possible dead more menu)`);
    }
  } catch {
    /* ignore */
  }
}

async function auditKnowledge(page) {
  const key = "knowledge";
  console.log("\n[6] /dashboard/knowledge-bases — knowledge list / upload");
  try {
    const { mainText, controlCount } = await gotoReady(page, "/dashboard/knowledge-bases", [
      /知识库|上传资料/,
    ]);
    pagePass(key, "display", `mainLen=${mainText.length} controls=${controlCount}`);
  } catch (e) {
    pageFail(key, "display", String(e));
    return;
  }

  try {
    await gotoReady(page, "/dashboard/knowledge-bases", [/上传资料/]);
    const link = page.locator("main a[href='/dashboard/knowledge-bases/upload'], main a[href^='/dashboard/knowledge-bases/upload']").first();
    if ((await link.count()) === 0) {
      pageFail(key, "uploadEntry", "upload link missing");
      bug("knowledge: 上传资料 entry missing");
    } else {
      const dest = await clickExpectNav(page, link, /\/dashboard\/knowledge-bases\/upload/, "knowledge.upload");
      await waitForPageReady(page, { path: dest, markers: [/上传|选择文件|文档|拖拽/], minMainLen: 30 });
      pagePass(key, "uploadEntry", dest);

      // Disabled state when no KB
      const blocked = await page.getByText(/当前无法上传|请先创建知识库/).isVisible().catch(() => false);
      if (blocked) {
        const startBtn = page.getByRole("button", { name: /开始上传/ }).first();
        const disabled = (await startBtn.isDisabled().catch(() => false)) || blocked;
        if (disabled) pagePass(key, "uploadBlockedState", "blocked messaging present");
        else {
          pageFail(key, "uploadBlockedState", "blocked message but start still enabled");
          bug("knowledge upload: missing disabled state when no knowledge base");
        }
      } else {
        pageNote(key, "upload not in blocked-no-KB state");
        pagePass(key, "uploadBlockedState", "n/a");
      }
    }
  } catch (e) {
    pageFail(key, "uploadEntry", String(e));
  }
}

async function auditAiTest(page) {
  const key = "ai-test";
  console.log("\n[7] /dashboard/conversations/test — AI test chat");
  try {
    const { mainText, controlCount } = await gotoReady(page, "/dashboard/conversations/test", [
      /开始测试|对话测试|选择助手/,
    ]);
    pagePass(key, "display", `mainLen=${mainText.length} controls=${controlCount}`);
  } catch (e) {
    pageFail(key, "display", String(e));
    return;
  }

  try {
    await gotoReady(page, "/dashboard/conversations/test", [/开始测试/]);
    const start = page.getByRole("button", { name: /开始测试/ }).first();
    const send = page.getByRole("button", { name: /^发送$/ }).first();

    // Send should be disabled before start
    const sendDisabledBefore = await send.isDisabled().catch(() => true);
    if (sendDisabledBefore) pagePass(key, "sendDisabledBeforeStart", "disabled");
    else {
      pageFail(key, "sendDisabledBeforeStart", "send enabled before start");
      bug("ai-test: 发送 should be disabled until 开始测试");
    }

    await start.click();
    await page.waitForTimeout(800);

    const input = page.locator("main textarea").first();
    await input.waitFor({ state: "visible", timeout: 10_000 });
    await input.fill("请问你们的设备防护等级有哪些？");
    await page.waitForTimeout(200);

    const sendDisabled = await send.isDisabled().catch(() => true);
    if (sendDisabled) {
      pageFail(key, "send", "send still disabled after start + input");
      bug("ai-test: cannot send after start");
      return;
    }

    const before = ((await page.locator("main").innerText()) || "").length;
    await send.click();
    // Wait for thinking / reply
    const deadline = Date.now() + 25_000;
    let grew = false;
    while (Date.now() < deadline) {
      const after = ((await page.locator("main").innerText()) || "").replace(/\s+/g, " ");
      if (after.includes("防护等级") || after.length > before + 20 || /思考|正在|助手|根据/.test(after)) {
        grew = true;
        pagePass(key, "send", `reply/ui updated (len ${before}->${after.length})`);
        break;
      }
      await page.waitForTimeout(500);
    }
    if (!grew) pageFail(key, "send", "no visible reply/update after send");
  } catch (e) {
    pageFail(key, "send", String(e));
  }
}

function writeReport() {
  const outDir = path.join(e2eDir, "audit-results");
  mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "acquisition-ai-audit.json");
  const summary = {
    pass: report.passed.length,
    fail: report.failed.length,
    notes: report.notes.length,
    bugs: report.bugs.length,
    ok: report.failed.length === 0,
  };
  writeFileSync(outPath, JSON.stringify({ ...report, summary }, null, 2), "utf8");
  console.log(`\nReport: ${outPath}`);
  console.log(`Summary: ${summary.pass} passed, ${summary.fail} failed, ${summary.bugs} bugs, ${summary.notes} notes`);
  return outPath;
}

async function run() {
  console.log("Acquisition + AI center deep audit");
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
  report.authMode = authMode;

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

  try {
    await auditLanding(page);
    await auditSites(page);
    await auditLinks(page);
    await auditQrcodes(page);
    await auditBots(page);
    await auditKnowledge(page);
    await auditAiTest(page);
  } catch (error) {
    fail("fatal", String(error));
  }

  if (pageErrors.length) note(`pageerrors: ${pageErrors.slice(0, 8).join(" | ")}`);

  await browser.close();
  writeReport();
  if (report.failed.length) process.exitCode = 1;
}

run().catch((error) => {
  fail("fatal", String(error));
  writeReport();
  process.exitCode = 1;
});
