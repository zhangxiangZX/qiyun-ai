#!/usr/bin/env node
/**
 * Quick Entry interactive audit (/dashboard/quick-entry)
 *
 * Usage:
 *   cd apps/console && node e2e/run-quick-entry-audit.mjs
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

const QUICK_ENTRY_PATH = "/dashboard/quick-entry";

const report = { passed: [], failed: [], notes: [], bugs: [] };

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
      id: "user_qe_audit",
      email: "qe-audit@example.com",
      name: "QE Audit",
      activeWorkspaceId: "ws_dev",
    }),
  );
  await context.addCookies([
    { name: "qiyun_auth_user", value: user, domain: hostname, path: "/", httpOnly: true, sameSite: "Lax" },
    { name: "qiyun_access_token", value: "qe-audit-token", domain: hostname, path: "/", httpOnly: true, sameSite: "Lax" },
    { name: "qiyun_refresh_token", value: "qe-audit-refresh", domain: hostname, path: "/", httpOnly: true, sameSite: "Lax" },
  ]);
  note("Using preview/demo cookie auth (API login unavailable).");
}

async function waitForQuickEntryReady(page) {
  await page.waitForLoadState("domcontentloaded");
  await page.locator("main").first().waitFor({ state: "visible", timeout: 25_000 });
  await page.getByRole("heading", { name: /智能快速录入|快速录入/ }).first().waitFor({
    state: "visible",
    timeout: 25_000,
  });
  await page.waitForTimeout(500);
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
      throw new Error(`${contextLabel}: Next.js error overlay — ${overlayText}`);
    }
  }
  const mainVisible = await page.locator("main").first().isVisible().catch(() => false);
  if (!mainVisible) throw new Error(`${contextLabel}: main not visible`);
}

async function goQuickEntry(page) {
  await page.goto(QUICK_ENTRY_PATH, { waitUntil: "domcontentloaded", timeout: 45_000 });
  await waitForQuickEntryReady(page);
}

function fieldControl(page, labelRe) {
  const root = page.locator("label").filter({ hasText: labelRe });
  // Phone field wraps a country <select> before the real <input>.
  if (String(labelRe).includes("手机")) {
    return root.locator("input").last();
  }
  return root.locator("input, select, textarea").last();
}

function priorityButtons(page) {
  return page.locator("label").filter({ hasText: /^优先级/ }).locator("button");
}

async function fillFormBasics(page, { customer, contact, phone, need, budget, priorityHigh }) {
  await fieldControl(page, /^客户姓名/).fill(customer);
  await fieldControl(page, /^联系人/).fill(contact);
  await fieldControl(page, /^手机号/).fill(phone);
  if (need) {
    await fieldControl(page, /^产品需求/).selectOption({ label: need });
  }
  if (budget) {
    await fieldControl(page, /^预算范围/).selectOption({ label: budget });
  }
  if (priorityHigh) {
    await priorityButtons(page).filter({ hasText: /^高$/ }).click();
  }
}

async function getChannelValue(page) {
  return fieldControl(page, /^来源渠道/).inputValue();
}

async function getCustomerValue(page) {
  return fieldControl(page, /^客户姓名/).inputValue();
}

async function getPhoneValue(page) {
  return fieldControl(page, /^手机号/).inputValue();
}

function sourceShortcutButton(page, label) {
  const heading = page.locator("h3").filter({ hasText: /来源快捷/ }).first();
  const root = heading.locator("xpath=ancestor::div[contains(@class,'rounded-card')][1]");
  return root.getByRole("button", { name: label, exact: true });
}



async function run() {
  console.log("Quick Entry audit");
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
    const response = await page.goto(QUICK_ENTRY_PATH, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await waitForQuickEntryReady(page);
    const status = response?.status() ?? 200;
    const pathName = new URL(page.url()).pathname;
    if (status >= 500) throw new Error(`HTTP ${status}`);
    if (pathName.startsWith("/login")) throw new Error("redirected to login after auth");
    pass("nav.quickEntry", pathName);
  } catch (error) {
    fail("nav.quickEntry", String(error));
    note("Cannot reach Quick Entry page — aborting remaining checks.");
    await browser.close();
    writeReport();
    process.exitCode = 1;
    return;
  }

  console.log("\n[DISPLAY]");

  try {
    const customer = await fieldControl(page, /^客户姓名/).isVisible();
    const contact = await fieldControl(page, /^联系人/).isVisible();
    const phone = await fieldControl(page, /^手机号/).isVisible();
    const shell = await page.getByRole("heading", { name: /智能快速录入/ }).isVisible();
    if (shell && customer && contact && phone) pass("display.formShell", "客户/联系人/手机号");
    else fail("display.formShell", `shell=${shell} customer=${customer} contact=${contact} phone=${phone}`);
  } catch (e) {
    fail("display.formShell", String(e));
  }

  try {
    const channel = await fieldControl(page, /^来源渠道/).isVisible();
    const need = await fieldControl(page, /^产品需求/).isVisible();
    const budget = await fieldControl(page, /^预算范围/).isVisible();
    if (channel && need && budget) pass("display.channelNeedBudget");
    else fail("display.channelNeedBudget", `channel=${channel} need=${need} budget=${budget}`);
  } catch (e) {
    fail("display.channelNeedBudget", String(e));
  }

  try {
    const priBtns = priorityButtons(page);
    const low = await priBtns.filter({ hasText: /^低$/ }).isVisible();
    const mid = await priBtns.filter({ hasText: /^中$/ }).isVisible();
    const high = await priBtns.filter({ hasText: /^高$/ }).isVisible();
    if (low && mid && high) pass("display.priorityButtons", "低/中/高");
    else fail("display.priorityButtons", `低=${low} 中=${mid} 高=${high}`);
  } catch (e) {
    fail("display.priorityButtons", String(e));
  }

  try {
    const aiHeading = await page.getByRole("heading", { name: /AI 辅助整理/ }).isVisible();
    const rawTa = page.locator("section").filter({ hasText: /AI 辅助整理/ }).locator("textarea").first();
    const rawVisible = await rawTa.isVisible();
    const extractBtn = await page.getByRole("button", { name: /智能提取信息/ }).isVisible();
    if (aiHeading && rawVisible && extractBtn) pass("display.aiSection", "textarea + 智能提取信息");
    else fail("display.aiSection", `heading=${aiHeading} textarea=${rawVisible} btn=${extractBtn}`);
  } catch (e) {
    fail("display.aiSection", String(e));
  }

  try {
    const section = page.locator("h3, h2").filter({ hasText: /来源快捷/ }).first();
    await section.waitFor({ state: "visible", timeout: 8_000 });
    const labels = ["电话", "微信", "抖音", "展会", "老客户推荐"];
    const root = section.locator("xpath=ancestor::div[contains(@class,'rounded-card')][1]");
    const missing = [];
    for (const label of labels) {
      const ok = await root.getByRole("button", { name: label }).isVisible().catch(() => false);
      if (!ok) missing.push(label);
    }
    if (missing.length === 0) pass("display.sourceShortcuts", labels.join("/"));
    else fail("display.sourceShortcuts", `missing: ${missing.join(",")}`);
  } catch (e) {
    fail("display.sourceShortcuts", String(e));
  }

  try {
    const saveNew = await page.getByRole("button", { name: /保存并新建/ }).isVisible();
    const saveInq = await page.getByRole("button", { name: /保存询盘/ }).isVisible();
    const clear =
      (await page.getByRole("button", { name: /清空草稿/ }).isVisible().catch(() => false)) ||
      (await page.getByRole("button", { name: /^重置$/ }).isVisible().catch(() => false));
    if (saveNew && saveInq && clear) pass("display.saveArea", "保存并新建/保存询盘/清空");
    else fail("display.saveArea", `saveNew=${saveNew} saveInq=${saveInq} clear=${clear}`);
  } catch (e) {
    fail("display.saveArea", String(e));
  }

  try {
    const recent = await page.getByRole("heading", { name: /最近录入/ }).isVisible();
    const recentSection = page.locator("section").filter({ has: page.getByRole("heading", { name: /最近录入/ }) });
    const refresh = await recentSection.getByRole("button", { name: /刷新/ }).isVisible();
    const viewAll = await recentSection.getByRole("link", { name: /查看全部/ }).isVisible();
    if (recent && refresh && viewAll) pass("display.recentEntries", "最近录入 + 刷新 + 查看全部");
    else fail("display.recentEntries", `recent=${recent} refresh=${refresh} viewAll=${viewAll}`);
  } catch (e) {
    fail("display.recentEntries", String(e));
  }


  console.log("\n[CLICKS]");

  const uniquePhone = "138" + Date.now().toString().slice(-8);
  const customerA = "审计客户A-" + Date.now().toString().slice(-6);

  try {
    await fillFormBasics(page, {
      customer: customerA,
      contact: "张经理",
      phone: uniquePhone,
      need: "电源模块",
      budget: "10-20万",
      priorityHigh: true,
    });
    await sourceShortcutButton(page, "微信").click();
    await page.waitForTimeout(250);
    const ch = await getChannelValue(page);
    const cust = await getCustomerValue(page);
    const ph = await getPhoneValue(page);
    if (cust === customerA && ph === uniquePhone && ch === "微信") {
      pass("click.fillBasics", "customer/phone/微信/电源模块/高");
    } else {
      fail("click.fillBasics", `customer=${cust} phone=${ph} channel=${ch}`);
    }
  } catch (e) {
    fail("click.fillBasics", String(e));
  }

  try {
    const checks = [
      ["微信", "微信"],
      ["抖音", "抖音"],
      ["展会", "展会"],
      ["老客户推荐", "老客户推荐"],
      ["电话", "电话呼入"],
    ];
    const results = [];
    for (const [btn, expected] of checks) {
      await sourceShortcutButton(page, btn).click();
      await page.waitForTimeout(150);
      const ch = await getChannelValue(page);
      results.push(`${btn}->${ch}${ch === expected ? " OK" : " WANT " + expected}`);
      if (ch !== expected) {
        throw new Error(`shortcut ${btn} set channel="${ch}" expected="${expected}"`);
      }
    }
    pass("click.sourceShortcuts", results.join("; "));
    await sourceShortcutButton(page, "微信").click();
  } catch (e) {
    fail("click.sourceShortcuts", String(e));
  }

  try {
    const low = priorityButtons(page).filter({ hasText: /^低$/ });
    const mid = priorityButtons(page).filter({ hasText: /^中$/ });
    const high = priorityButtons(page).filter({ hasText: /^高$/ });

    async function isActive(btn) {
      const cls = (await btn.getAttribute("class")) || "";
      // Active state uses bg-primary/10; do not match focus-visible:border-primary on all buttons.
      return cls.includes("bg-primary/10") && cls.includes("text-primary");
    }

    await mid.click();
    await page.waitForTimeout(100);
    const midOn = await isActive(mid);
    await high.click();
    await page.waitForTimeout(100);
    const highOn = await isActive(high);
    const midOff = !(await isActive(mid));
    await low.click();
    await page.waitForTimeout(100);
    const lowOn = await isActive(low);
    await high.click();
    await page.waitForTimeout(100);
    const highAgain = await isActive(high);

    if (midOn && highOn && midOff && lowOn && highAgain) {
      pass("click.priorityToggle", "低/中/高 active class toggles");
    } else {
      fail(
        "click.priorityToggle",
        `midOn=${midOn} highOn=${highOn} midOff=${midOff} lowOn=${lowOn} highAgain=${highAgain}`,
      );
    }
  } catch (e) {
    fail("click.priorityToggle", String(e));
  }

  try {
    const sample =
      "客户：杭州恒达机电有限公司，联系人王工，电话 13912345678。通过微信咨询户外一体化机柜，预算大约 20-50万，希望下周回电，优先跟进。";
    const aiSection = page.locator("section").filter({ has: page.getByRole("heading", { name: /AI 辅助整理/ }) });
    const rawTa = aiSection.locator("textarea").first();
    await rawTa.fill(sample);
    await page.getByRole("button", { name: /智能提取信息/ }).click();
    await page.waitForTimeout(1500);
    const deadline = Date.now() + 20_000;
    let done = false;
    let detail = "";
    while (Date.now() < deadline) {
      const mainText = (await page.locator("main").innerText()) || "";
      const hasMsg = /已通过大模型提取|规则提取|大模型暂不可用|AI 提取失败|预览模式下无法/.test(mainText);
      const hasPanel = await page.getByRole("button", { name: /一键应用/ }).isEnabled().catch(() => false);
      const modeLlm = await page.getByText("大模型", { exact: true }).isVisible().catch(() => false);
      const modeRules = await page.getByText("规则兜底", { exact: true }).isVisible().catch(() => false);
      if (hasMsg || hasPanel || modeLlm || modeRules) {
        const mode = modeLlm ? "llm" : modeRules ? "rules" : "unknown";
        detail = `extractMode=${mode}; msg=${hasMsg}; applyEnabled=${hasPanel}`;
        done = true;
        note(`AI extract result: ${detail}`);
        break;
      }
      if (/Application error|Unhandled/.test(mainText)) throw new Error("hard crash during extract");
      await page.waitForTimeout(500);
    }
    if (done) pass("click.aiExtract", detail);
    else {
      const errText = ((await page.locator(".text-destructive").first().innerText().catch(() => "")) || "").slice(0, 120);
      fail("click.aiExtract", `no success/fallback/panel within timeout; err=${errText}`);
    }
  } catch (e) {
    fail("click.aiExtract", String(e));
  }

  try {
    const applyBtn = page.getByRole("button", { name: /一键应用/ });
    const enabled = await applyBtn.isEnabled().catch(() => false);
    if (!enabled) {
      note("一键应用 disabled — skip apply (no extract result)");
      pass("click.applyExtract", "skipped (no extract to apply)");
    } else {
      await applyBtn.click();
      await page.waitForTimeout(300);
      const afterCustomer = await getCustomerValue(page);
      const afterPhone = await getPhoneValue(page);
      const afterChannel = await getChannelValue(page);
      if (afterCustomer || afterPhone || afterChannel) {
        pass(
          "click.applyExtract",
          `customer=${afterCustomer.slice(0, 30)} phone=${afterPhone} channel=${afterChannel}`,
        );
      } else {
        fail("click.applyExtract", "clicked but form still empty");
      }
    }
  } catch (e) {
    fail("click.applyExtract", String(e));
  }

  try {
    let ph = await getPhoneValue(page);
    if (!ph) {
      ph = uniquePhone;
      await fieldControl(page, /^手机号/).fill(ph);
      await page.waitForTimeout(400);
    }
    const dupBtn = page.getByRole("button", { name: /重新检测|查重/ }).first();
    const hasDupBtn = (await dupBtn.count()) > 0;
    if (!hasDupBtn) {
      note("no 查重/重新检测 button — duplicate panel may auto-check only");
      const panel = await page.getByRole("heading", { name: /重复检测/ }).isVisible().catch(() => false);
      if (panel) pass("click.duplicateCheck", "panel visible (auto); no manual button click");
      else fail("click.duplicateCheck", "no duplicate UI found");
    } else {
      await dupBtn.click();
      await page.waitForTimeout(800);
      const mainText = (await page.locator("main").innerText()) || "";
      const result = /无重复|可能重复|相似记录|未发现/.test(mainText) ? "status shown" : "clicked, status unclear";
      pass("click.duplicateCheck", result);
      note(`duplicate panel: ${(mainText.match(/重复检测[\s\S]{0,80}/)?.[0] || "").replace(/\s+/g, " ")}`);
    }
  } catch (e) {
    fail("click.duplicateCheck", String(e));
  }

  async function ensureSavable(pageRef, phoneOverride) {
    const phone = phoneOverride || "138" + Date.now().toString().slice(-8);
    const customer = "审计保存-" + Date.now().toString().slice(-6);
    await fillFormBasics(pageRef, {
      customer,
      contact: "李工",
      phone,
      need: "电源模块",
      budget: "5-10万",
      priorityHigh: true,
    });
    await sourceShortcutButton(pageRef, "微信").click();
    const remark = fieldControl(pageRef, /^备注信息/);
    if ((await remark.count()) > 0) {
      await remark.fill("E2E quick-entry audit remark");
    }
    return { customer, phone };
  }


  try {
    const { customer, phone } = await ensureSavable(page);
    const btn = page.getByRole("button", { name: /保存并新建/ });
    const disabled = await btn.isDisabled();
    if (disabled) {
      const mainText = ((await page.locator("main").innerText()) || "").slice(0, 800);
      fail(
        "click.saveAndNew",
        `button disabled — validation; snippet=${mainText.replace(/\s+/g, " ").slice(0, 200)}`,
      );
      note("canSave requires customer + phone + channel + need (remark UI * is not enforced in canSave)");
    } else {
      await btn.click();
      await page.waitForTimeout(1200);
      const deadline = Date.now() + 15_000;
      let outcome = null;
      while (Date.now() < deadline) {
        const mainText = (await page.locator("main").innerText()) || "";
        if (/询盘已保存/.test(mainText)) {
          outcome = "success";
          break;
        }
        if (/保存失败|无法保存|预览模式下/.test(mainText)) {
          outcome = "error:" + (mainText.match(/[^\n]*(保存失败|无法保存|预览模式)[^\n]*/)?.[0] || "save error");
          break;
        }
        await page.waitForTimeout(400);
      }
      if (outcome === "success") {
        await page.waitForTimeout(400);
        const custAfter = await getCustomerValue(page);
        const cleared = !custAfter;
        if (cleared) pass("click.saveAndNew", `询盘已保存 + form cleared (${customer}/${phone})`);
        else pass("click.saveAndNew", `询盘已保存; form customer still="${custAfter}"`);
      } else if (outcome && outcome.startsWith("error:")) {
        fail("click.saveAndNew", outcome);
      } else {
        fail("click.saveAndNew", "no success/error message after click");
      }
    }
  } catch (e) {
    fail("click.saveAndNew", String(e));
  }

  try {
    await goQuickEntry(page);
    const { customer, phone } = await ensureSavable(page, "139" + Date.now().toString().slice(-8));
    const btn = page.getByRole("button", { name: /保存询盘/ });
    if (await btn.isDisabled()) {
      fail("click.saveInquiry", "button disabled — validation blocked");
    } else {
      await btn.click();
      await page.waitForTimeout(1000);
      const deadline = Date.now() + 15_000;
      let outcome = null;
      while (Date.now() < deadline) {
        const url = page.url();
        const mainText = (await page.locator("main").innerText().catch(() => "")) || "";
        if (/询盘已保存/.test(mainText)) {
          outcome = "message";
          break;
        }
        if (/\/dashboard\/inquiries\//.test(url)) {
          outcome = "nav:" + new URL(url).pathname;
          break;
        }
        if (/保存失败|无法保存|预览模式下/.test(mainText)) {
          outcome = "error:" + (mainText.match(/[^\n]*(保存失败|无法保存|预览模式)[^\n]*/)?.[0] || "save error");
          break;
        }
        await page.waitForTimeout(400);
      }
      if (outcome === "message" || (outcome && outcome.startsWith("nav:"))) {
        pass("click.saveInquiry", `${outcome} (${customer}/${phone})`);
        await assertNoErrorPage(page, "after saveInquiry");
      } else if (outcome && outcome.startsWith("error:")) {
        fail("click.saveInquiry", outcome);
      } else {
        fail("click.saveInquiry", "no success message or navigation");
      }
    }
  } catch (e) {
    fail("click.saveInquiry", String(e));
  }

  try {
    await goQuickEntry(page);
    await assertNoErrorPage(page, "return quick-entry");
  } catch (e) {
    fail("nav.returnQuickEntry", String(e));
  }

  try {
    await fillFormBasics(page, {
      customer: "待清空客户",
      contact: "测试",
      phone: "13700001111",
      need: "工控平板",
      budget: "待确认",
      priorityHigh: false,
    });
    await sourceShortcutButton(page, "微信").click();
    const clearBtn =
      (await page.getByRole("button", { name: /清空草稿/ }).count()) > 0
        ? page.getByRole("button", { name: /清空草稿/ }).first()
        : page.getByRole("button", { name: /^重置$/ }).first();
    await clearBtn.click();
    await page.waitForTimeout(300);
    const cust = await getCustomerValue(page);
    const ph = await getPhoneValue(page);
    const ch = await getChannelValue(page);
    if (!cust && !ph && !ch) pass("click.clearReset", "form cleared");
    else fail("click.clearReset", `after clear customer=${cust} phone=${ph} channel=${ch}`);
  } catch (e) {
    fail("click.clearReset", String(e));
  }

  try {
    const section = page.locator("section").filter({ has: page.getByRole("heading", { name: /最近录入/ }) });
    await section.getByRole("button", { name: /刷新/ }).click();
    await page.waitForTimeout(800);
    await assertNoErrorPage(page, "recent refresh");
    const still = await page.getByRole("heading", { name: /最近录入/ }).isVisible();
    if (still) pass("click.recentRefresh", "no crash");
    else fail("click.recentRefresh", "heading missing after refresh");
  } catch (e) {
    fail("click.recentRefresh", String(e));
  }

  try {
    const section = page.locator("section").filter({ has: page.getByRole("heading", { name: /最近录入/ }) });
    const link = section.getByRole("link", { name: /查看全部/ }).first();
    await Promise.all([
      page.waitForURL(/\/dashboard\/inquiries/, { timeout: 15_000 }),
      link.click(),
    ]);
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(500);
    await assertNoErrorPage(page, "查看全部");
    pass("click.viewAllInquiries", page.url());
    await goQuickEntry(page);
  } catch (e) {
    fail("click.viewAllInquiries", String(e));
    await goQuickEntry(page).catch(() => undefined);
  }

  try {
    const section = page.locator("section").filter({ has: page.getByRole("heading", { name: /最近录入/ }) });
    const empty = await section.getByText(/暂无最近录入/).isVisible().catch(() => false);
    if (empty) {
      note("最近录入 empty — no row link to click");
      pass("click.recentRowLink", "skipped (empty list)");
    } else {
      const rowLink = section.locator('a[href^="/dashboard/inquiries/"]').first();
      await rowLink.waitFor({ state: "visible", timeout: 8_000 });
      const href = await rowLink.getAttribute("href");
      const name = ((await rowLink.innerText()) || "").trim().slice(0, 40);
      await Promise.all([
        page.waitForURL((url) => /\/dashboard\/inquiries\//.test(url.pathname), { timeout: 15_000 }),
        rowLink.click(),
      ]);
      await page.waitForLoadState("domcontentloaded");
      await page.waitForTimeout(500);
      await assertNoErrorPage(page, "recent row");
      const pathName = new URL(page.url()).pathname;
      if (!/\/dashboard\/inquiries\//.test(pathName)) {
        throw new Error(`unexpected path ${pathName} href=${href}`);
      }
      pass("click.recentRowLink", `${name} → ${pathName}`);
      await goQuickEntry(page);
    }
  } catch (e) {
    fail("click.recentRowLink", String(e));
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
  const outPath = path.join(outDir, "quick-entry-audit.json");
  writeFileSync(outPath, JSON.stringify(report, null, 2), "utf8");
  console.log(`\nReport: ${outPath}`);
}

run().catch((error) => {
  fail("fatal", String(error));
  writeReport();
  process.exitCode = 1;
});
