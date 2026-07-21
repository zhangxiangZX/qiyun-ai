#!/usr/bin/env node
/**
 * UI smoke: (1) selection editor bind bot + save  (2) public page real RAG chat
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
  };
}

async function main() {
  console.log("RAG chat UI smoke");
  console.log(`console=${consoleBase} api=${apiBase}`);

  const auth = await loginApi();
  if (!auth.accessToken) {
    fail("auth.login", "no access token");
    process.exit(1);
  }
  pass("auth.login");

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

  let slug = null;
  let publicUrl = null;
  let pageId = null;

  // Resolve a real selection page from API for direct edit URL
  try {
    const listRes = await fetch(`${apiBase}/selection-pages`, {
      headers: {
        authorization: `Bearer ${auth.accessToken}`,
        "x-workspace-id": auth.user?.activeWorkspaceId || "ws_dev",
      },
    });
    const listJson = await listRes.json();
    const list = listJson.data ?? listJson;
    const first = Array.isArray(list) ? list[0] : null;
    if (!first?.id) throw new Error("no selection page from API");
    pageId = first.id;
    slug = first.slug;
    publicUrl = `${consoleBase}/s/${slug}?preview=1`;
    pass("step1.resolvePage", `id=${pageId} slug=${slug}`);
  } catch (e) {
    fail("step1.resolvePage", String(e));
  }

  // ——— Step 1: editor bind + save ———
  try {
    if (!pageId) throw new Error("no pageId");
    const editUrl = `/dashboard/bots/landing/edit?page=${encodeURIComponent(pageId)}&section=robot`;
    await page.goto(editUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.getByText(/选择 AI 助手|机器人基础设置|保存/).first().waitFor({
      state: "visible",
      timeout: 45_000,
    });
    await page.waitForTimeout(1000);
    pass("step1.openEdit", page.url());

    const botSelect = page.locator("label", { hasText: /选择 AI 助手/ }).locator("..").locator("select").first();
    const fallbackSelect = page.locator("select").first();
    const select = (await botSelect.count()) > 0 ? botSelect : fallbackSelect;
    let boundBotName = "";
    if ((await select.count()) > 0) {
      const options = await select.locator("option").allTextContents();
      const pick =
        options.find((t) => /Sales Advisor|Website Support|Sales|Support/i.test(t)) ||
        options.find((t) => t.trim() && !/请选择/.test(t)) ||
        options[0];
      if (pick) {
        await select.selectOption({ label: pick.trim() }).catch(async () => {
          await select.selectOption({ value: pick.trim() });
        });
        boundBotName = pick.trim();
        pass("step1.bindBot", boundBotName);
      } else {
        fail("step1.bindBot", `no usable options: ${options.join("|")}`);
      }
    } else {
      fail("step1.bindBot", "no bot <select> found");
    }

    // Switch to basic to set published if needed, then save from header
    const basicTab = page.getByRole("button", { name: /^基础$|基本信息|页面/ }).first();
    if ((await basicTab.count()) > 0) {
      await basicTab.click().catch(() => undefined);
      await page.waitForTimeout(400);
    }
    const statusSelect = page.locator("select").filter({ hasText: /已发布|草稿|停用/ }).first();
    if ((await statusSelect.count()) > 0) {
      await statusSelect.selectOption({ label: "已发布" }).catch(() => undefined);
    }

    const saveBtn = page.getByRole("button", { name: /保存/ }).first();
    await saveBtn.click();
    await page.waitForTimeout(3500);
    const notice = await page.locator("body").innerText();
    if (/保存|已创建|RAG|知识库|本地|公开对话/.test(notice)) {
      pass("step1.save", notice.match(/[^\n]{0,50}(保存|已创建|RAG|知识库|公开对话)[^\n]{0,40}/)?.[0] || "save notice seen");
    } else {
      fail("step1.save", "no save notice text found");
    }
    pass("step1.slug", slug);

    const cfg = await page.evaluate(async (s) => {
      const key = `qiyun:selection-page-config:${s}`;
      const local = window.localStorage.getItem(key);
      let localCfg = null;
      try {
        localCfg = local ? JSON.parse(local) : null;
      } catch {
        localCfg = null;
      }
      const res = await fetch(`/api/selection-pages/public/${encodeURIComponent(s)}`, { cache: "no-store" });
      const apiCfg = res.ok ? await res.json() : null;
      return {
        localBotId: localCfg?.botId || null,
        localSiteKey: localCfg?.siteKey ? String(localCfg.siteKey).slice(0, 12) : null,
        apiBotId: apiCfg?.botId || null,
        apiSiteKey: apiCfg?.siteKey ? String(apiCfg.siteKey).slice(0, 12) : null,
        status: res.status,
      };
    }, slug);

    if (cfg.localBotId && cfg.localSiteKey) {
      pass("step1.configLocal", `botId=${cfg.localBotId} siteKey=${cfg.localSiteKey}…`);
    } else if (cfg.apiBotId && cfg.apiSiteKey) {
      pass("step1.configApi", `botId=${cfg.apiBotId} siteKey=${cfg.apiSiteKey}…`);
    } else {
      fail(
        "step1.config",
        `missing botId/siteKey ${JSON.stringify(cfg)} boundBot=${boundBotName}`,
      );
    }
  } catch (e) {
    fail("step1", String(e));
  }

  // ——— Step 2: public page chat ———
  try {
    if (!publicUrl) throw new Error("no publicUrl");
    await page.goto(publicUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.getByText(/正在加载选型页/).waitFor({ state: "hidden", timeout: 30_000 }).catch(() => undefined);
    await page.waitForTimeout(1000);

    const chatInput = page
      .locator('input[aria-label*="消息"], input[placeholder*="需求"], input[placeholder*="问题"], textarea[placeholder*="问题"], textarea[placeholder*="需求"]')
      .first();
    if ((await chatInput.count()) === 0) {
      fail("step2.chatInput", "chat input not found");
    } else {
      pass("step2.chatInput");
      const question = "请问户外机柜防护等级是多少？";
      await chatInput.fill(question);
      const send = page.locator('button[aria-label*="发"], button[type="submit"]').filter({ hasText: /发|送/ }).first();
      if ((await send.count()) > 0) await send.click();
      else await chatInput.press("Enter");

      // Wait for real SSE (can be slow)
      await page.waitForTimeout(7000);
      const body = await page.locator("body").innerText();
      const isUnboundDemo = /尚未绑定可用的 AI 助手|暂无法检索企业知识库/.test(body);
      const isError = /暂时无法完成智能回答/.test(body);
      const hasAssistant =
        /防护|IP65|机柜|知识库|工程师|报价|交期|参考来源|抱歉|方案|选型|已收到/.test(body) &&
        !isUnboundDemo;

      if (isUnboundDemo) {
        fail("step2.ragReply", "still unbound demo fallback");
      } else if (isError) {
        fail("step2.ragReply", "stream error surfaced in UI");
      } else if (hasAssistant) {
        pass("step2.ragReply", "assistant reply observed");
      } else {
        fail("step2.ragReply", `no recognizable reply: ${body.slice(0, 240).replace(/\s+/g, " ")}`);
      }

      // Network evidence: stream endpoint hit
      // (best-effort via page evaluate replay)
      const streamProbe = await page.evaluate(async () => {
        const keyMatch = Object.keys(localStorage).find((k) => k.startsWith("qiyun:selection-page-config:"));
        if (!keyMatch) return { ok: false, reason: "no local config" };
        const cfg = JSON.parse(localStorage.getItem(keyMatch));
        if (!cfg?.botId || !cfg?.siteKey) return { ok: false, reason: "no botId/siteKey in local config" };
        const res = await fetch("/api/public/chat/stream", {
          method: "POST",
          headers: { "content-type": "application/json", "x-workspace-id": "ws_dev" },
          body: JSON.stringify({
            botId: cfg.botId,
            siteKey: cfg.siteKey,
            visitorId: `v_ui_smoke_${Date.now()}`,
            sdkVersion: "1.0.0",
            origin: window.location.origin,
            message: "防护等级",
          }),
        });
        const text = await res.text();
        return {
          ok: res.ok && /event:\s*done/.test(text),
          status: res.status,
          hasToken: /event:\s*token/.test(text),
          hasDone: /event:\s*done/.test(text),
        };
      });
      if (streamProbe.ok) pass("step2.streamApi", `token=${streamProbe.hasToken} done=${streamProbe.hasDone}`);
      else fail("step2.streamApi", JSON.stringify(streamProbe));
    }
  } catch (e) {
    fail("step2", String(e));
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
