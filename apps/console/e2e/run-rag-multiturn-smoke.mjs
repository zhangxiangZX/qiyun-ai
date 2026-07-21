#!/usr/bin/env node
/**
 * Smoke: multi-turn RAG chat
 *  - same-page turn2 reuses conversationId
 *  - visitorId persists across refresh
 *  - AI test page also reuses conversationId across turns
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
  return (json.data ?? json).revealedSiteKey;
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
    pageId: patch.pageId || "smoke-multi",
    slug: patch.slug,
    enabled: true,
    published: true,
    sourceId: `${patch.slug}_v1`,
    botId: patch.botId,
    siteKey: patch.siteKey,
    header: { title: "多轮冒烟助手", subtitle: "测试", brandLetter: "M" },
    welcome: { title: "您好", highlight: "多轮对话", chips: ["测试"] },
    productChips: [],
    defaultProduct: "户外机柜",
    robot: {
      openingMessage: "您好，我们来做多轮对话测试。",
      recommendedQuestions: ["先介绍一下产品"],
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

function attachStreamCapture(page) {
  const captured = [];
  page.on("request", (req) => {
    if (!req.url().includes("/public/chat/stream") || req.method() !== "POST") return;
    try {
      const body = req.postDataJSON();
      captured.push({
        at: Date.now(),
        botId: body?.botId,
        visitorId: body?.visitorId,
        conversationId: body?.conversationId || null,
        message: body?.message,
      });
    } catch {
      captured.push({ at: Date.now(), parseError: true });
    }
  });
  return captured;
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
  await page.waitForTimeout(600);
}

async function sendPublicChat(page, text) {
  const chatInput = page.locator('input[aria-label="输入消息"], input[placeholder*="需求"]').first();
  await chatInput.fill(text);
  await page.locator('button[aria-label="发送"]').click();
  await page.waitForTimeout(7000);
}

async function main() {
  console.log("RAG multi-turn smoke");
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
    fail("site", "missing");
    process.exit(1);
  }
  pass("site", salesSite.botId);

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
  const captured = attachStreamCapture(page);

  // ——— Public page multi-turn ———
  const slug = `rag-multi-${Date.now().toString(36)}`;
  try {
    const siteKey = await rotateSiteKey(auth, salesSite.id);
    await seedPublicConfig(
      page,
      minimalPublicConfig({
        slug,
        botId: salesSite.botId,
        siteKey,
      }),
    );

    const before = captured.length;
    await sendPublicChat(page, "先介绍一下你们的户外机柜");
    await sendPublicChat(page, "那防护等级一般能做到多少？");

    const turns = captured.slice(before).filter((c) => !c.parseError);
    if (turns.length < 2) {
      fail("public.turns", `expected >=2 stream posts, got ${turns.length}`);
    } else {
      pass("public.turns", `${turns.length} stream posts`);
      const t1 = turns[0];
      const t2 = turns[1];

      if (!t1.conversationId) {
        // First request may omit conversationId; response creates one.
        // Second request must include it.
        pass("public.turn1.noConvYet", "first request intentionally without conversationId");
      } else {
        pass("public.turn1.hasConv", t1.conversationId);
      }

      if (!t2.conversationId) {
        fail("public.turn2.reusesConv", "second request missing conversationId");
      } else if (t1.conversationId && t2.conversationId !== t1.conversationId) {
        fail(
          "public.turn2.reusesConv",
          `mismatch t1=${t1.conversationId} t2=${t2.conversationId}`,
        );
      } else {
        pass("public.turn2.reusesConv", t2.conversationId);
      }

      if (t1.visitorId && t2.visitorId && t1.visitorId === t2.visitorId) {
        pass("public.sameVisitor", t1.visitorId);
      } else {
        fail("public.sameVisitor", `t1=${t1.visitorId} t2=${t2.visitorId}`);
      }
    }

    const visitorBefore = await page.evaluate((s) => {
      return window.localStorage.getItem(`qy_selection_visitor_${s}`);
    }, slug);

    if (visitorBefore) pass("public.visitorStored", visitorBefore);
    else fail("public.visitorStored", "missing localStorage visitor id");

    await page.reload({ waitUntil: "domcontentloaded" });
    await page
      .getByText(/正在加载选型页/)
      .waitFor({ state: "hidden", timeout: 30_000 })
      .catch(() => undefined);
    await page.waitForTimeout(600);

    const visitorAfter = await page.evaluate((s) => {
      return window.localStorage.getItem(`qy_selection_visitor_${s}`);
    }, slug);

    if (visitorBefore && visitorAfter && visitorBefore === visitorAfter) {
      pass("public.visitorPersist", visitorAfter);
    } else {
      fail("public.visitorPersist", `before=${visitorBefore} after=${visitorAfter}`);
    }

    // After refresh, conversationId is in-memory only — new chat should start without old id
    const beforeRefreshTurn = captured.length;
    await sendPublicChat(page, "刷新后重新问：有哪些型号？");
    const afterReload = captured.slice(beforeRefreshTurn).filter((c) => !c.parseError);
    if (afterReload.length >= 1) {
      if (!afterReload[0].conversationId) {
        pass("public.afterReload.newConv", "refresh starts without prior conversationId");
      } else {
        // Acceptable if we later persist conversationId; currently expect empty.
        fail(
          "public.afterReload.newConv",
          `unexpected conversationId after refresh: ${afterReload[0].conversationId}`,
        );
      }
      if (visitorBefore && afterReload[0].visitorId === visitorBefore) {
        pass("public.afterReload.sameVisitor", afterReload[0].visitorId);
      } else {
        fail(
          "public.afterReload.sameVisitor",
          `expected ${visitorBefore} got ${afterReload[0]?.visitorId}`,
        );
      }
    } else {
      fail("public.afterReload", "no stream after refresh");
    }
  } catch (e) {
    fail("public.multi", String(e));
  }

  // ——— AI test page multi-turn ———
  try {
    const before = captured.length;
    await page.goto("/dashboard/conversations/test", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await page.getByText(/开始测试/).first().waitFor({ state: "visible", timeout: 45_000 });
    await page.waitForTimeout(800);

    const botSelect = page.locator('label:has-text("选择助手") select').first();
    if ((await botSelect.count()) > 0) {
      const options = await botSelect.locator("option").all();
      for (const opt of options) {
        const value = await opt.getAttribute("value");
        const label = (await opt.textContent()) || "";
        if (value && /sales|advisor/i.test(`${value} ${label}`)) {
          await botSelect.selectOption(value);
          break;
        }
      }
    }
    await page.getByRole("button", { name: /开始测试/ }).click();
    await page.waitForTimeout(1000);

    await page.getByPlaceholder(/请输入你的问题/).fill("你们主打哪些机柜？");
    await page.getByRole("button", { name: /^发送$/ }).click();
    await page.waitForTimeout(8000);
    await page.getByPlaceholder(/请输入你的问题/).fill("第二轮：防护等级呢？");
    await page.getByRole("button", { name: /^发送$/ }).click();
    await page.waitForTimeout(8000);

    const turns = captured.slice(before).filter((c) => !c.parseError);
    if (turns.length < 2) {
      fail("aitest.turns", `expected >=2, got ${turns.length}`);
    } else {
      pass("aitest.turns", `${turns.length}`);
      const t1 = turns[0];
      const t2 = turns[1];
      if (!t2.conversationId) {
        fail("aitest.turn2.reusesConv", "missing conversationId on turn 2");
      } else if (t1.conversationId && t2.conversationId !== t1.conversationId) {
        fail("aitest.turn2.reusesConv", `t1=${t1.conversationId} t2=${t2.conversationId}`);
      } else {
        pass("aitest.turn2.reusesConv", t2.conversationId);
      }
      if (t1.visitorId && t1.visitorId === t2.visitorId) {
        pass("aitest.sameVisitor", t1.visitorId);
      } else {
        fail("aitest.sameVisitor", `t1=${t1.visitorId} t2=${t2.visitorId}`);
      }
    }
  } catch (e) {
    fail("aitest.multi", String(e));
  }

  await browser.close();

  const failed = results.filter((r) => !r.ok);
  console.log(`\nSummary: ${results.length - failed.length}/${results.length} passed`);
  if (failed.length) {
    for (const f of failed) console.log(`  - ${f.id}: ${f.detail}`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
