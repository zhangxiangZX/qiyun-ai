#!/usr/bin/env node
/**
 * Smoke: AI test page + public lead-capture hint + unbound/failure fallbacks
 */
import { chromium } from "@playwright/test";

const consoleBase = (process.env.CONSOLE_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const apiBase = (process.env.API_BASE_URL || "http://localhost:3001").replace(/\/$/, "");
const email = process.env.E2E_EMAIL || "owner@qiyun.ai";
const password = process.env.E2E_PASSWORD || "Qiyun@2026";

const results = [];
function pass(id, detail = "") {
  results.push({ id, ok: true, detail });
  console.log(`PASS  ${id}${detail ? ` — ${detail}` : ""}`);
}
function fail(id, detail = "") {
  results.push({ id, ok: false, detail });
  console.log(`FAIL  ${id}${detail ? ` — ${detail}` : ""}`);
}

async function loginApi() {
  const res = await fetch(`${apiBase}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const json = await res.json();
  const payload = json.data ?? json;
  return {
    accessToken: payload.tokens?.accessToken ?? payload.accessToken,
    refreshToken: payload.tokens?.refreshToken ?? payload.refreshToken,
    user: payload.user,
    workspaceId: payload.user?.activeWorkspaceId || "ws_dev",
  };
}

async function rotateSiteKey(auth, siteId) {
  const res = await fetch(`${apiBase}/sites/${siteId}/rotate-key`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${auth.accessToken}`,
      "x-workspace-id": auth.workspaceId,
      "content-type": "application/json",
    },
  });
  const json = await res.json();
  const data = json.data ?? json;
  return data.revealedSiteKey;
}

async function listSites(auth) {
  const res = await fetch(`${apiBase}/sites`, {
    headers: {
      authorization: `Bearer ${auth.accessToken}`,
      "x-workspace-id": auth.workspaceId,
    },
  });
  const json = await res.json();
  return json.data ?? json;
}

function minimalPublicConfig(patch) {
  return {
    pageId: patch.pageId || "smoke-rag",
    slug: patch.slug,
    enabled: true,
    published: true,
    sourceId: `${patch.slug}_v1`,
    botId: patch.botId,
    siteKey: patch.siteKey,
    header: { title: "冒烟选型助手", subtitle: "测试", brandLetter: "S" },
    welcome: { title: "您好", highlight: "完成选型", chips: ["测试"] },
    productChips: [],
    defaultProduct: "户外机柜",
    robot: {
      openingMessage: "您好，我是冒烟测试助手。",
      recommendedQuestions: ["防护等级？"],
    },
    demoMessages: [],
    completeness: { percent: 10, items: [] },
    upload: {
      title: "上传",
      hint: "",
      buttonLabel: "上传",
      sampleFileName: "",
      sampleFileSize: "",
    },
    form: {
      fields: [
        {
          id: "name",
          label: "联系人",
          type: "text",
          required: true,
          placeholder: "姓名",
          span: 1,
        },
        {
          id: "phone",
          label: "手机",
          type: "tel",
          required: true,
          placeholder: "手机号",
          span: 1,
        },
      ],
      privacyNote: "同意联系",
    },
    footer: {
      continueLabel: "继续",
      submitLabel: "提交需求",
      submitSub: "工程师跟进",
    },
    postSubmit: { successTitle: "成功", successMessage: "已收到" },
  };
}

async function seedPublicConfig(page, config) {
  await page.goto(`${consoleBase}/s/${config.slug}?preview=1`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await page.evaluate(async (cfg) => {
    const key = `qiyun:selection-page-config:${cfg.slug}`;
    window.localStorage.setItem(key, JSON.stringify(cfg));
    await fetch(`/api/selection-pages/public/${encodeURIComponent(cfg.slug)}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(cfg),
    });
  }, config);
  await page.goto(`${consoleBase}/s/${config.slug}?preview=1`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await page
    .getByText(/正在加载选型页/)
    .waitFor({ state: "hidden", timeout: 30_000 })
    .catch(() => undefined);
  await page.waitForTimeout(800);
}

async function sendPublicChat(page, text) {
  const chatInput = page.locator('input[aria-label="输入消息"], input[placeholder*="需求"]').first();
  await chatInput.fill(text);
  await page.locator('button[aria-label="发送"]').click();
  await page.waitForTimeout(6500);
  return page.locator("body").innerText();
}

async function main() {
  console.log("RAG gaps smoke: AI test + lead hint + unbound/fail");
  const auth = await loginApi();
  if (!auth.accessToken) {
    fail("auth", "no token");
    process.exit(1);
  }
  pass("auth");

  const sites = await listSites(auth);
  const salesSite =
    (Array.isArray(sites) ? sites : []).find((s) => s.botId === "bot-sales") ||
    (Array.isArray(sites) ? sites : [])[0];
  if (!salesSite?.id) {
    fail("site.resolve", "no site for RAG");
  } else {
    pass("site.resolve", `${salesSite.id} bot=${salesSite.botId}`);
  }

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    baseURL: consoleBase,
    viewport: { width: 1440, height: 900 },
  });
  const host = new URL(consoleBase).hostname;
  await ctx.addCookies([
    {
      name: "qiyun_access_token",
      value: auth.accessToken,
      domain: host,
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
    {
      name: "qiyun_refresh_token",
      value: auth.refreshToken || auth.accessToken,
      domain: host,
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
    {
      name: "qiyun_auth_user",
      value: encodeURIComponent(JSON.stringify(auth.user)),
      domain: host,
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
  const page = await ctx.newPage();

  // ——— A) AI 测试页 ———
  try {
    await page.goto("/dashboard/conversations/test", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await page.getByText(/AI 对话测试|开始测试/).first().waitFor({
      state: "visible",
      timeout: 45_000,
    });
    await page.waitForTimeout(1000);

    const botSelect = page.locator('label:has-text("选择助手") select').first();
    if ((await botSelect.count()) > 0) {
      const options = await botSelect.locator("option").all();
      for (const opt of options) {
        const value = await opt.getAttribute("value");
        const label = (await opt.textContent()) || "";
        if (value && /sales|销售|advisor/i.test(`${value} ${label}`)) {
          await botSelect.selectOption(value);
          pass("aitest.selectBot", label.trim() || value);
          break;
        }
      }
      if (!results.some((r) => r.id === "aitest.selectBot")) {
        await botSelect.selectOption({ index: 0 });
        pass("aitest.selectBot", "first option");
      }
    } else {
      fail("aitest.selectBot", "select missing");
    }

    await page.getByRole("button", { name: /开始测试/ }).click();
    await page.waitForTimeout(1200);
    const started = await page.getByPlaceholder(/请输入你的问题/).isEnabled();
    if (started) pass("aitest.started");
    else fail("aitest.started", "input still disabled");

    await page.getByPlaceholder(/请输入你的问题/).fill("这批机柜大概报价多少？交期多久？");
    await page.getByRole("button", { name: /^发送$/ }).click();
    await page.waitForTimeout(9000);

    const body = await page.locator("body").innerText();
    if (/建议引导留资|已触发留资引导/.test(body)) {
      pass("aitest.leadBadge", "lead guidance visible");
    } else if (/暂时无法完成真实 RAG|思考中/.test(body) && body.length > 80) {
      fail("aitest.leadBadge", "got fallback/error instead of lead guidance");
    } else if (/报价|交期|联系|工程师|跟进|抱歉|机柜/.test(body)) {
      // reply came but badge may not if needsLeadCapture false
      fail("aitest.leadBadge", `reply ok but no lead badge: ${body.slice(0, 220).replace(/\s+/g, " ")}`);
    } else {
      fail("aitest.reply", `no assistant reply: ${body.slice(0, 220).replace(/\s+/g, " ")}`);
    }

    if (/暂时无法完成真实 RAG/.test(body)) {
      fail("aitest.stream", "fell back after stream failure");
    } else {
      pass("aitest.stream", "no failure fallback banner");
    }
  } catch (e) {
    fail("aitest", String(e));
  }

  // ——— B) 公开页留资引导 ———
  try {
    if (!salesSite?.id) throw new Error("no site");
    const siteKey = await rotateSiteKey(auth, salesSite.id);
    const slug = `rag-lead-${Date.now().toString(36)}`;
    await seedPublicConfig(
      page,
      minimalPublicConfig({
        slug,
        botId: salesSite.botId,
        siteKey,
      }),
    );
    const body = await sendPublicChat(page, "请给一个准确报价和交期确认");
    if (/建议留下联系方式|涉及报价\/交期|提交下方联系方式|leadBanner|工程师将尽快跟进/.test(body)) {
      pass("lead.publicHint", "lead banner/hint observed");
    } else if (/暂时无法完成智能回答/.test(body)) {
      fail("lead.publicHint", "stream error instead of lead hint");
    } else if (/报价|交期|联系|工程师|跟进/.test(body)) {
      // soft: reply mentions lead-ish content but UI banner missing
      fail("lead.publicHint", `reply without explicit lead banner: ${body.slice(0, 260).replace(/\s+/g, " ")}`);
    } else {
      fail("lead.publicHint", `unexpected body: ${body.slice(0, 260).replace(/\s+/g, " ")}`);
    }
  } catch (e) {
    fail("lead", String(e));
  }

  // ——— C) 未绑定兜底 ———
  try {
    const slug = `rag-unbound-${Date.now().toString(36)}`;
    await seedPublicConfig(
      page,
      minimalPublicConfig({
        slug,
        botId: undefined,
        siteKey: undefined,
      }),
    );
    // ensure no botId in local storage
    await page.evaluate((s) => {
      const key = `qiyun:selection-page-config:${s}`;
      const raw = window.localStorage.getItem(key);
      if (!raw) return;
      const cfg = JSON.parse(raw);
      delete cfg.botId;
      delete cfg.siteKey;
      window.localStorage.setItem(key, JSON.stringify(cfg));
    }, slug);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(800);
    const body = await sendPublicChat(page, "防护等级是多少？");
    if (/尚未绑定可用的 AI 助手|暂无法检索企业知识库/.test(body)) {
      pass("fallback.unbound", "unbound message shown");
    } else {
      fail("fallback.unbound", body.slice(0, 260).replace(/\s+/g, " "));
    }
  } catch (e) {
    fail("fallback.unbound", String(e));
  }

  // ——— D) 失败兜底（坏 siteKey）———
  try {
    const slug = `rag-fail-${Date.now().toString(36)}`;
    await seedPublicConfig(
      page,
      minimalPublicConfig({
        slug,
        botId: salesSite?.botId || "bot-sales",
        siteKey: "pk_invalid_smoke_key_should_fail",
      }),
    );
    const body = await sendPublicChat(page, "防护等级是多少？");
    if (/暂时无法完成智能回答/.test(body)) {
      pass("fallback.fail", "stream error message shown");
    } else if (/尚未绑定/.test(body)) {
      fail("fallback.fail", "got unbound message instead of stream error");
    } else {
      fail("fallback.fail", body.slice(0, 260).replace(/\s+/g, " "));
    }
  } catch (e) {
    fail("fallback.fail", String(e));
  }

  await browser.close();

  const failed = results.filter((r) => !r.ok);
  console.log(`\nSummary: ${results.length - failed.length}/${results.length} passed`);
  if (failed.length) {
    console.log("Failed:");
    for (const f of failed) console.log(`  - ${f.id}: ${f.detail}`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
