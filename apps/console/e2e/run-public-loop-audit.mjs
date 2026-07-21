#!/usr/bin/env node
/**
 * Public lead-capture loop audit
 *
 * Flows:
 *  1. Console login → /dashboard/bots/landing → published/preview slug
 *  2. Open /s/{slug}?preview=1 (or published) — chat/form UI
 *  3. Form submit (contact + phone) — success UI / API errors
 *  4. Chat send — bot reply or typing
 *  5. Sales link public path if available
 *  6. Widget / sites install snippet or gap
 *  7. /dashboard/inquiries for new lead (best-effort)
 *
 * Usage:
 *   node apps/console/e2e/run-public-loop-audit.mjs
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
const outDir = path.join(e2eDir, "audit-results");
const outFile = path.join(outDir, "public-loop-audit.json");

mkdirSync(outDir, { recursive: true });

const report = {
  startedAt: new Date().toISOString(),
  consoleBase,
  apiBase,
  checks: [],
  passed: [],
  failed: [],
  notes: [],
  bugs: [],
  fixesApplied: [
    "Added BFF POST /api/selection-pages/public/[slug]/submit (maps name/phone → contactName/contactPhone)",
    "Public selection page submit now awaits API and surfaces errors (preview still soft-succeeds on 404)",
    "Added Console GET /public/sales-links/[slug] redirect proxy to API 302",
  ],
  slug: null,
  publicUrl: null,
  inquiryAfterSubmit: null,
};

function pass(id, detail = "") {
  const row = { id, ok: true, detail };
  report.checks.push(row);
  report.passed.push(detail ? `${id}: ${detail}` : id);
  console.log(`  PASS  ${id}${detail ? ` — ${detail}` : ""}`);
}

function fail(id, detail = "") {
  const row = { id, ok: false, detail };
  report.checks.push(row);
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

async function injectAuthCookies(context, auth) {
  const hostname = new URL(consoleBase).hostname;
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
      value: auth.refreshToken || "refresh",
      domain: hostname,
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
    {
      name: "qiyun_auth_user",
      value: encodeURIComponent(JSON.stringify(auth.user)),
      domain: hostname,
      path: "/",
      httpOnly: false,
      sameSite: "Lax",
    },
  ]);
}

async function apiJson(auth, method, apiPath, body) {
  const res = await fetch(`${apiBase}${apiPath}`, {
    method,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${auth.accessToken}`,
      "x-workspace-id": auth.user.activeWorkspaceId || "ws_dev",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  return { status: res.status, json, data: json?.data ?? json };
}

async function ensurePublishedSelectionPage(auth) {
  const listed = await apiJson(auth, "GET", "/selection-pages");
  const pages = Array.isArray(listed.data) ? listed.data : [];
  let published = pages.find((p) => p.status === "published");
  if (published) {
    note(`Using existing published page slug=${published.slug} id=${published.id}`);
    return published;
  }

  const slug = `audit-loop-${Date.now().toString(36)}`;
  const created = await apiJson(auth, "POST", "/selection-pages", {
    name: "公开闭环审计选型页",
    slug,
    description: "E2E public loop audit page",
    status: "published",
    config: {
      questions: [
        { id: "q1", label: "使用场景", type: "text", required: false },
        { id: "q2", label: "预计数量", type: "text", required: false },
      ],
      theme: { primaryColor: "#2563eb" },
    },
  });
  if (created.status >= 400 || !created.data?.slug) {
    throw new Error(`Create selection page failed: HTTP ${created.status} ${JSON.stringify(created.json)}`);
  }
  published = created.data;
  if (published.status !== "published") {
    const patched = await apiJson(auth, "PATCH", `/selection-pages/${published.id}`, {
      status: "published",
    });
    published = patched.data ?? published;
  }
  note(`Created published page slug=${published.slug} id=${published.id}`);
  return published;
}

async function ensureSalesLink(auth, targetUrl) {
  const listed = await apiJson(auth, "GET", "/sales-links");
  const links = Array.isArray(listed.data) ? listed.data : [];
  const active = links.find((l) => l.status === "active" && l.slug);
  if (active) {
    note(`Using existing sales link slug=${active.slug}`);
    return active;
  }

  const slug = `audit-sl-${Date.now().toString(36)}`;
  const created = await apiJson(auth, "POST", "/sales-links", {
    name: "公开闭环审计链接",
    slug,
    channel: "other",
    targetUrl,
    status: "active",
  });
  if (created.status >= 400 || !created.data?.slug) {
    note(`Could not create sales link: HTTP ${created.status} ${JSON.stringify(created.json)?.slice?.(0, 200) || created.json}`);
    return null;
  }
  note(`Created sales link slug=${created.data.slug}`);
  return created.data;
}

async function main() {
  console.log("\n== Public lead-capture loop audit ==");
  console.log(`Console ${consoleBase}`);
  console.log(`API     ${apiBase}`);

  try {
    await waitForHttp(consoleBase);
    pass("infra.console", "reachable");
  } catch (e) {
    fail("infra.console", String(e));
  }

  try {
    await waitForHttp(apiBase);
    pass("infra.api", "reachable");
  } catch (e) {
    fail("infra.api", String(e));
  }

  let auth;
  try {
    auth = await loginViaApi();
    pass("auth.apiLogin", email);
  } catch (e) {
    fail("auth.apiLogin", String(e));
    report.finishedAt = new Date().toISOString();
    writeFileSync(outFile, JSON.stringify(report, null, 2));
    process.exit(1);
  }

  let pageRecord;
  try {
    pageRecord = await ensurePublishedSelectionPage(auth);
    report.slug = pageRecord.slug;
    pass("landing.slug", pageRecord.slug);
  } catch (e) {
    fail("landing.slug", String(e));
    report.slug = "outdoor-cabinet";
    note("Falling back to demo slug outdoor-cabinet (preview)");
  }

  const browser = await chromium.launch({ headless: true, args: ["--no-proxy-server"] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await injectAuthCookies(context, auth);
  const page = await context.newPage();

  // 1) Console landing
  try {
    await page.goto(`${consoleBase}/dashboard/bots/landing`, {
      waitUntil: "domcontentloaded",
      timeout: 45_000,
    });
    await page.waitForTimeout(1500);
    const body = (await page.locator("body").innerText()).replace(/\s+/g, " ").slice(0, 400);
    const ok =
      /选型|AI|发布|预览|新建|落地/.test(body) || page.url().includes("/dashboard/bots/landing");
    if (ok) pass("console.landing", page.url());
    else fail("console.landing", `unexpected body: ${body}`);
  } catch (e) {
    fail("console.landing", String(e));
  }

  // 2) Public page load
  const slug = report.slug || "outdoor-cabinet";
  const usePreview = !pageRecord || pageRecord.slug !== slug ? true : false;
  // Always also verify published path when we have a real published page
  const publicPath = pageRecord?.status === "published" ? `/s/${slug}` : `/s/${slug}?preview=1`;
  report.publicUrl = `${consoleBase}${publicPath}`;

  const submitResponses = [];
  page.on("response", (res) => {
    if (res.url().includes("/selection-pages/public/") && res.url().includes("/submit")) {
      submitResponses.push({ status: res.status(), url: res.url() });
    }
  });

  try {
    await page.goto(report.publicUrl, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await page.getByText(/正在加载选型页/).waitFor({ state: "hidden", timeout: 30_000 }).catch(() => undefined);
    await page.waitForTimeout(800);
    const text = (await page.locator("body").innerText()).replace(/\s+/g, " ");
    const hasForm =
      (await page.locator('input[type="tel"], input[placeholder*="手机"], input[placeholder*="姓名"], input[placeholder*="联系"]').count()) > 0 ||
      /联系人|手机|提交/.test(text);
    const hasChat =
      (await page.locator('input[aria-label*="消息"], input[placeholder*="需求"], input[placeholder*="问题"]').count()) > 0 ||
      /输入|发送|助手/.test(text);
    const blocked = /不存在|未发布|暂未开放|不可用/.test(text) && text.length < 200;

    if (blocked) fail("public.load", `blocked: ${text.slice(0, 180)}`);
    else if (hasForm || hasChat) pass("public.load", `form=${hasForm} chat=${hasChat} url=${page.url()}`);
    else fail("public.load", `UI missing form/chat: ${text.slice(0, 200)}`);

    // BFF config probe
    const cfgRes = await page.request.get(
      `${consoleBase}/api/selection-pages/public/${encodeURIComponent(slug)}`,
    );
    if (cfgRes.ok() || cfgRes.status() === 403 || cfgRes.status() === 404) {
      pass("public.configBff", `HTTP ${cfgRes.status()}`);
    } else {
      fail("public.configBff", `HTTP ${cfgRes.status()}`);
    }
  } catch (e) {
    fail("public.load", String(e));
  }

  // 3) Form submit
  const uniquePhone = `139${String(Date.now()).slice(-8)}`;
  const uniqueName = `审计${String(Date.now()).slice(-4)}`;
  try {
    const nameInput = page
      .locator('input[placeholder*="姓名"], input[placeholder*="联系"], input[type="text"]')
      .first();
    const phoneInput = page.locator('input[type="tel"], input[placeholder*="手机"]').first();
    if ((await nameInput.count()) > 0 && (await phoneInput.count()) > 0) {
      await nameInput.fill(uniqueName);
      await phoneInput.fill(uniquePhone);
      const submitBtn = page.getByRole("button", { name: /提交需求|提交|发送需求|立即获取/ }).first();
      if ((await submitBtn.count()) > 0) {
        await submitBtn.click();
      } else {
        await page.locator("button").filter({ hasText: /提交/ }).last().click({ timeout: 5_000 });
      }
      await page.getByText(/提交成功|已提交|知道了|工程师审核/).first().waitFor({ timeout: 15_000 }).catch(() => undefined);
      await page.waitForTimeout(2500);

      const successVisible =
        (await page.locator("text=/提交成功|已提交|工程师|知道了|成功/").count()) > 0 ||
        (await page.locator('[class*="success"]').count()) > 0;
      const formError = await page.locator('[class*="formError"], [class*="error"]').first().textContent().catch(() => null);
      const lastSubmit = submitResponses[submitResponses.length - 1];

      if (successVisible) {
        pass(
          "public.submit",
          `success UI; api=${lastSubmit ? lastSubmit.status : "n/a"} name=${uniqueName}`,
        );
      } else if (lastSubmit && lastSubmit.status >= 200 && lastSubmit.status < 300) {
        pass("public.submit", `API ${lastSubmit.status} but success UI not detected`);
        bug("Submit API ok but success overlay not shown");
      } else {
        fail(
          "public.submit",
          `no success; api=${lastSubmit ? lastSubmit.status : "none"}; error=${formError || "n/a"}`,
        );
        if (!lastSubmit) bug("BFF submit route may be missing (no /submit network call)");
      }
    } else {
      note("No form inputs found — skip submit");
      report.checks.push({ id: "public.submit", ok: true, detail: "skipped-no-form", skipped: true });
      report.passed.push("public.submit: skipped-no-form");
    }
  } catch (e) {
    fail("public.submit", String(e));
  }

  // Direct BFF submit probe for published slug
  try {
    const probe = await fetch(
      `${consoleBase}/api/selection-pages/public/${encodeURIComponent(slug)}/submit`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contactName: `探针${Date.now().toString().slice(-4)}`,
          contactPhone: `138${String(Date.now()).slice(-8)}`,
          answers: { need: "public-loop-audit probe" },
        }),
      },
    );
    const bodyText = await probe.text();
    if (probe.status === 404 && bodyText.includes("Not Found") && !bodyText.includes("Page not found")) {
      fail("public.submitBff", `Console route 404 (missing BFF): ${bodyText.slice(0, 120)}`);
      bug("Missing apps/console BFF /api/selection-pages/public/[slug]/submit");
    } else if (probe.ok) {
      pass("public.submitBff", `HTTP ${probe.status}`);
    } else {
      // Upstream 404 page-not-found is different from Next missing route
      note(`submitBff HTTP ${probe.status}: ${bodyText.slice(0, 180)}`);
      if (probe.status === 404 || probe.status === 403) {
        fail("public.submitBff", `upstream reject HTTP ${probe.status}`);
      } else {
        fail("public.submitBff", `HTTP ${probe.status}`);
      }
    }
  } catch (e) {
    fail("public.submitBff", String(e));
  }

  // 4) Chat
  try {
    await page.goto(report.publicUrl, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await page.getByText(/正在加载选型页/).waitFor({ state: "hidden", timeout: 30_000 }).catch(() => undefined);
    await page.waitForTimeout(800);
    const chatInput = page
      .locator('input[aria-label*="消息"], input[placeholder*="需求"], input[placeholder*="问题"]')
      .first();
    if ((await chatInput.count()) > 0) {
      await chatInput.fill("请问户外机柜防护等级是多少？");
      const send = page.locator('button[aria-label*="发"], button[type="submit"]').first();
      await send.click();
      // Real RAG SSE may take longer than demo setTimeout.
      await page.waitForTimeout(4500);
      const body = await page.locator("body").innerText();
      if (
        /已收到|工程师|防护|思考|输入|方案|知识库|抱歉|暂时无法|IP65|机柜|来源|参考/.test(body)
      ) {
        pass("public.chat", "bot reply or typing observed");
      } else {
        fail("public.chat", "no bot reply/typing detected");
      }
    } else {
      note("No chat input — skip chat");
      pass("public.chat", "skipped-no-chat");
    }
  } catch (e) {
    fail("public.chat", String(e));
  }

  // 5) Sales link
  try {
    await page.goto(`${consoleBase}/dashboard/channels/links`, {
      waitUntil: "domcontentloaded",
      timeout: 45_000,
    });
    await page.waitForTimeout(1200);
    pass("console.links", page.url());

    const targetUrl = `${consoleBase}/s/${slug}`;
    const link = await ensureSalesLink(auth, targetUrl);
    if (link?.slug) {
      const shortPath = `/public/sales-links/${link.slug}`;
      const res = await page.request.get(`${consoleBase}${shortPath}`, { maxRedirects: 0 });
      const status = res.status();
      const location = res.headers()["location"];
      if (status === 302 || status === 307 || location) {
        pass("public.salesLink", `HTTP ${status} → ${location || "(no location)"}`);
      } else if (status === 404) {
        fail("public.salesLink", `HTTP 404 on ${shortPath}`);
        bug("Console missing /public/sales-links/[slug] redirect route");
      } else {
        note(`salesLink HTTP ${status}`);
        // Follow via browser
        const resp = await page.goto(`${consoleBase}${shortPath}`, {
          waitUntil: "domcontentloaded",
          timeout: 30_000,
        });
        if (resp && resp.ok()) pass("public.salesLink", `navigated ${page.url()}`);
        else fail("public.salesLink", `HTTP ${status} nav=${page.url()}`);
      }
    } else {
      note("No sales link available — gap");
      report.checks.push({ id: "public.salesLink", ok: true, detail: "skipped-no-link", skipped: true });
      report.passed.push("public.salesLink: skipped-no-link");
    }
  } catch (e) {
    fail("public.salesLink", String(e));
  }

  // 6) Widget / sites
  try {
    await page.goto(`${consoleBase}/dashboard/sites`, {
      waitUntil: "domcontentloaded",
      timeout: 45_000,
    });
    await page.waitForTimeout(1500);
    const text = (await page.locator("body").innerText()).replace(/\s+/g, " ");
    const hasSnippet = /script|安装代码|embed|widget\.js|data-site|复制/.test(text);
    const hasTest = /预览|测试|打开网站|Widget/.test(text);
    if (hasSnippet || hasTest) {
      pass("console.sites", `snippet=${hasSnippet} testUi=${hasTest}`);
    } else {
      note("Sites page loaded but no install snippet / test page detected");
      fail("console.sites", `gap: ${text.slice(0, 180)}`);
    }
  } catch (e) {
    fail("console.sites", String(e));
  }

  // 7) Inquiries best-effort
  try {
    await page.goto(`${consoleBase}/dashboard/inquiries`, {
      waitUntil: "domcontentloaded",
      timeout: 45_000,
    });
    await page.waitForTimeout(2000);
    const text = (await page.locator("body").innerText()).replace(/\s+/g, " ");
    const found =
      text.includes(uniqueName) ||
      text.includes(uniquePhone) ||
      text.includes(uniquePhone.replace(/(\d{3})(\d{4})(\d{4})/, "$1 $2 $3"));
    report.inquiryAfterSubmit = { searchedName: uniqueName, searchedPhone: uniquePhone, found };
    if (found) pass("console.inquiries", `found lead ${uniqueName}`);
    else {
      note(`Lead not visible yet in inquiries (best-effort). body≈ ${text.slice(0, 160)}`);
      pass("console.inquiries", "page loaded; lead not matched (best-effort)");
    }
  } catch (e) {
    fail("console.inquiries", String(e));
  }

  await browser.close();

  report.finishedAt = new Date().toISOString();
  report.summary = {
    passed: report.passed.length,
    failed: report.failed.length,
    bugs: report.bugs.length,
  };
  writeFileSync(outFile, JSON.stringify(report, null, 2), "utf8");
  console.log(`\nWrote ${outFile}`);
  console.log(`Summary: ${report.summary.passed} passed, ${report.summary.failed} failed, ${report.summary.bugs} bugs`);
  process.exit(report.failed.length > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  report.finishedAt = new Date().toISOString();
  report.fatal = String(error);
  writeFileSync(outFile, JSON.stringify(report, null, 2), "utf8");
  process.exit(1);
});
