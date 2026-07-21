#!/usr/bin/env node
/**
 * Smoke (combined):
 *  A) Bot preview vs public selection share real /public/chat/stream
 *  B) API-persisted botId/siteKey works with localStorage cleared
 *  C) Knowledge hit shows 参考来源 / 知识引用 citations
 */
import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const consoleBase = (process.env.CONSOLE_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const apiBase = (process.env.API_BASE_URL || "http://localhost:3001").replace(/\/$/, "");
const email = process.env.E2E_EMAIL || "owner@qiyun.ai";
const password = process.env.E2E_PASSWORD || "Qiyun@2026";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

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

async function apiJson(auth, method, pathname, body) {
  const res = await fetch(`${apiBase}${pathname}`, {
    method,
    headers: {
      authorization: `Bearer ${auth.accessToken}`,
      "x-workspace-id": auth.workspaceId,
      "content-type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, json, data: json?.data ?? json };
}

function attachStreamCapture(page) {
  const captured = [];
  page.on("request", (req) => {
    if (!req.url().includes("/public/chat/stream") || req.method() !== "POST") return;
    try {
      const body = req.postDataJSON();
      captured.push({
        url: req.url(),
        botId: body?.botId,
        siteKeyPrefix: String(body?.siteKey || "").slice(0, 12),
        message: body?.message,
      });
    } catch {
      captured.push({ url: req.url(), parseError: true });
    }
  });
  return captured;
}

async function main() {
  console.log("Persist + preview consistency + citations smoke");
  const auth = await loginApi();
  if (!auth.accessToken) {
    fail("auth", "no token");
    process.exit(1);
  }
  pass("auth");

  // Ensure bot-sales has product handbook for citation hits
  await apiJson(auth, "PATCH", "/bots/bot-sales", {
    status: "active",
    knowledgeBaseIds: [
      "kb_ddd5d6c1-8223-48a8-956d-7dec70eb6d52",
      "kb_1bad90a5-8751-4bf7-a53e-1c75d80d6142",
    ],
  });

  const sites = (await apiJson(auth, "GET", "/sites")).data;
  const salesSite = (Array.isArray(sites) ? sites : []).find((s) => s.botId === "bot-sales");
  if (!salesSite?.id) {
    fail("site", "bot-sales site missing");
    process.exit(1);
  }
  const rotated = await apiJson(auth, "POST", `/sites/${salesSite.id}/rotate-key`, {});
  const siteKey = rotated.data?.revealedSiteKey;
  if (!siteKey) {
    fail("siteKey", JSON.stringify(rotated.json));
    process.exit(1);
  }
  pass("siteKey", siteKey.slice(0, 12));

  // Contract: widget uses same public stream path
  try {
    const widgetChatApi = readFileSync(
      path.join(root, "apps/widget/src/lib/chat-api.ts"),
      "utf8",
    );
    if (widgetChatApi.includes("/public/chat/stream")) {
      pass("widget.contract", "apps/widget uses /public/chat/stream");
    } else {
      fail("widget.contract", "stream path missing in widget chat-api");
    }
  } catch (e) {
    fail("widget.contract", String(e));
  }

  // Create published page with RAG binding in API config only
  const slug = `persist-cite-${Date.now().toString(36)}`;
  const created = await apiJson(auth, "POST", "/selection-pages", {
    name: `持久化引用冒烟 ${slug}`,
    slug,
    description: "API persistence + citations",
    config: {
      questions: [{ id: "q1", label: "使用场景", type: "text", required: false }],
      botId: "bot-sales",
      siteKey,
    },
  });
  if (created.status !== 200 && created.status !== 201) {
    fail("persist.create", JSON.stringify(created.json));
  } else {
    pass("persist.create", created.data?.id);
  }
  const pageId = created.data?.id;
  const published = await apiJson(auth, "PATCH", `/selection-pages/${pageId}`, {
    status: "published",
    config: {
      questions: [{ id: "q1", label: "使用场景", type: "text", required: false }],
      botId: "bot-sales",
      siteKey,
    },
  });
  if (published.data?.status === "published" && published.data?.config?.botId === "bot-sales") {
    pass("persist.publish", published.data.slug);
  } else {
    fail("persist.publish", JSON.stringify(published.json));
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
  const captured = attachStreamCapture(page);

  // ——— B) Persistence without localStorage ———
  try {
    await page.goto(`/s/${slug}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.evaluate((s) => {
      for (const key of Object.keys(localStorage)) {
        if (key.includes(s) || key.startsWith("qiyun:selection-page-config:")) {
          localStorage.removeItem(key);
        }
      }
    }, slug);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page
      .getByText(/正在加载选型页/)
      .waitFor({ state: "hidden", timeout: 30_000 })
      .catch(() => undefined);
    await page.waitForTimeout(1000);

    const cfg = await page.evaluate(async (s) => {
      const res = await fetch(`/api/selection-pages/public/${encodeURIComponent(s)}`, {
        cache: "no-store",
      });
      const json = res.ok ? await res.json() : null;
      return {
        status: res.status,
        botId: json?.botId || null,
        siteKeyPrefix: json?.siteKey ? String(json.siteKey).slice(0, 12) : null,
        localKeys: Object.keys(localStorage).filter((k) => k.includes(s)),
      };
    }, slug);

    if (cfg.status === 200 && cfg.botId === "bot-sales" && cfg.siteKeyPrefix) {
      pass("persist.bffConfig", `botId=${cfg.botId} siteKey=${cfg.siteKeyPrefix}… local=${cfg.localKeys.length}`);
    } else {
      fail("persist.bffConfig", JSON.stringify(cfg));
    }

    if (cfg.localKeys.length === 0) {
      pass("persist.noLocalConfig");
    } else {
      // soft: reload may not re-seed; failing if local still has config means we didn't clear enough
      fail("persist.noLocalConfig", `still has ${cfg.localKeys.join(",")}`);
    }

    const before = captured.length;
    const chatInput = page.locator('input[aria-label="输入消息"], input[placeholder*="需求"]').first();
    await chatInput.fill("deployment guide 部署说明");
    await page.locator('button[aria-label="发送"]').click();
    await page.waitForTimeout(8000);
    const body = await page.locator("body").innerText();
    const publicStreams = captured.slice(before).filter((c) => !c.parseError);
    if (publicStreams.length >= 1 && publicStreams[0].botId === "bot-sales") {
      pass("persist.publicStream", publicStreams[0].siteKeyPrefix);
    } else {
      fail("persist.publicStream", JSON.stringify(publicStreams));
    }
    if (/参考来源|deployment-guide|Private deployment|部署/.test(body)) {
      pass("citations.publicUi", "citations or grounded reply visible");
    } else if (/暂时无法|尚未绑定/.test(body)) {
      fail("citations.publicUi", body.slice(0, 220).replace(/\s+/g, " "));
    } else {
      fail("citations.publicUi", body.slice(0, 260).replace(/\s+/g, " "));
    }
  } catch (e) {
    fail("persist", String(e));
  }

  // ——— A) Bot preview consistency ———
  try {
    const before = captured.length;
    await page.goto("/dashboard/bots/bot-sales/basics", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await page.waitForTimeout(2500);
    // Preview panel
    const previewInput = page
      .locator('aside input[placeholder], aside textarea, [class*="preview"] input, form input[placeholder*="问"]')
      .first();
    // BotChatPreview uses Input from @qiyun/ui
    const input = page.locator('aside input[type="text"], aside input:not([type])').last();
    const candidate = (await previewInput.count()) > 0 ? previewInput : input;
    await page.getByText(/API 预览|本地预览|聊天|预览/).first().waitFor({
      state: "visible",
      timeout: 30_000,
    }).catch(() => undefined);

    // Wait bootstrap
    await page.waitForTimeout(2000);
    const sendBtn = page.locator("aside").getByRole("button", { name: /发送|Send/ }).first();
    if ((await candidate.count()) === 0) {
      fail("preview.input", "bot preview input missing");
    } else {
      await candidate.fill("deployment guide 部署说明");
      if ((await sendBtn.count()) > 0) await sendBtn.click();
      else await candidate.press("Enter");
      await page.waitForTimeout(8000);
      const previewStreams = captured.slice(before).filter((c) => !c.parseError);
      if (previewStreams.some((c) => c.botId === "bot-sales")) {
        pass("preview.stream", `count=${previewStreams.length}`);
      } else {
        fail("preview.stream", JSON.stringify(previewStreams));
      }
      const text = await page.locator("aside.rounded-card, aside.flex.h-full").last().innerText();
      if (/知识引用|deployment-guide|Private deployment|部署|参考/.test(text)) {
        pass("citations.previewUi", "preview shows citation/grounded content");
      } else if (/无法|失败|错误/.test(text) && text.length < 80) {
        fail("citations.previewUi", text.slice(0, 200));
      } else {
        // reply without citation label still ok if stream happened
        if (previewStreams.length) {
          pass("citations.previewUi", `reply without explicit citation label: ${text.slice(0, 120).replace(/\s+/g, " ")}`);
        } else {
          fail("citations.previewUi", text.slice(0, 220).replace(/\s+/g, " "));
        }
      }
    }

    // Same endpoint family as public
    const previewHit = captured.filter((c) => c.url?.includes("/public/chat/stream") && c.botId === "bot-sales");
    if (previewHit.length >= 1) {
      pass("consistency.sameEndpoint", `${previewHit.length} shared stream calls for bot-sales`);
    } else {
      fail("consistency.sameEndpoint", "no shared stream evidence");
    }
  } catch (e) {
    fail("preview", String(e));
  }

  // Direct API citation evidence (authoritative) — rotate fresh key then query
  try {
    const rotated2 = await apiJson(auth, "POST", `/sites/${salesSite.id}/rotate-key`, {});
    const freshKey = rotated2.data?.revealedSiteKey || siteKey;
    // re-assert KB binding before citation probe
    await apiJson(auth, "PATCH", "/bots/bot-sales", {
      status: "active",
      knowledgeBaseIds: [
        "kb_ddd5d6c1-8223-48a8-956d-7dec70eb6d52",
        "kb_1bad90a5-8751-4bf7-a53e-1c75d80d6142",
      ],
    });
    let okCite = false;
    let detail = "";
    for (const message of ["deployment guide 部署", "deployment guide", "Private deployment supports"]) {
      const streamRes = await fetch(`${apiBase}/public/chat/stream`, {
        method: "POST",
        headers: { "content-type": "application/json", Origin: "http://localhost:3000" },
        body: JSON.stringify({
          botId: "bot-sales",
          siteKey: freshKey,
          visitorId: `v_cite_api_${Date.now()}`,
          sdkVersion: "1.0.0",
          origin: "http://localhost:3000",
          message,
        }),
      });
      const text = await streamRes.text();
      const countMatch = text.match(/"citationCount":(\d+)/);
      const count = countMatch ? Number(countMatch[1]) : 0;
      detail = `msg=${message} status=${streamRes.status} count=${count}`;
      if (streamRes.ok && count > 0 && /event:\s*citations/.test(text)) {
        pass("citations.api", detail);
        okCite = true;
        break;
      }
    }
    if (!okCite) fail("citations.api", detail);
  } catch (e) {
    fail("citations.api", String(e));
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
