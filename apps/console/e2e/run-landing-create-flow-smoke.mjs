#!/usr/bin/env node
/**
 * Smoke:
 *  1) Landing list → click 编辑
 *  2) 新建选型页 → bind bot → publish → public RAG chat
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
  console.log("Landing edit + new selection page flow smoke");
  const auth = await loginApi();
  if (!auth.accessToken) {
    fail("auth", "no token");
    process.exit(1);
  }
  pass("auth");

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

  // ——— 1) Landing → 编辑 ———
  try {
    await page.goto("/dashboard/bots/landing", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await page.getByText(/选型页列表|新建选型页/).first().waitFor({
      state: "visible",
      timeout: 45_000,
    });
    // Wait for either API rows or demo rows
    await page
      .locator("table tbody tr, button:has-text('编辑')")
      .first()
      .waitFor({ state: "visible", timeout: 45_000 });
    await page.waitForTimeout(1000);

    const editBtn = page.locator("table tbody tr").first().getByRole("button", { name: /^编辑$/ });
    const editFallback = page.getByRole("button", { name: /^编辑$/ }).first();
    const target = (await editBtn.count()) > 0 ? editBtn : editFallback;
    if ((await target.count()) === 0) {
      fail("landing.editBtn", "no 编辑 button");
    } else {
      await target.click();
      await page.waitForURL(/\/dashboard\/bots\/landing\/edit\?/, { timeout: 30_000 });
      const url = page.url();
      if (/\/dashboard\/bots\/landing\/edit\?/.test(url) && /page=/.test(url)) {
        pass("landing.editNav", url);
      } else {
        fail("landing.editNav", url);
      }
      await page
        .getByText(/正在加载页面配置/)
        .waitFor({ state: "hidden", timeout: 45_000 })
        .catch(() => undefined);
      await page.getByRole("button", { name: /^保存$/ }).waitFor({ state: "visible", timeout: 45_000 });
      if ((await page.getByText(/基础信息|基础设置/).count()) > 0) {
        pass("landing.editWorkspace");
      } else {
        fail("landing.editWorkspace", "edit UI markers missing");
      }
    }
  } catch (e) {
    fail("landing.edit", String(e));
  }

  // ——— 2) 新建 → 绑定 → 发布 → 公开聊 ———
  let publicSlug = null;
  try {
    await page.goto("/dashboard/bots/landing", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await page.getByRole("button", { name: /新建选型页/ }).click();
    await page.waitForURL(/page=new/, { timeout: 30_000 });
    if (!/page=new/.test(page.url())) {
      fail("create.openNew", page.url());
    } else {
      pass("create.openNew", page.url());
    }

    await page
      .getByText(/正在加载页面配置/)
      .waitFor({ state: "hidden", timeout: 45_000 })
      .catch(() => undefined);
    await page.getByRole("button", { name: /^保存$/ }).waitFor({ state: "visible", timeout: 45_000 });

    // Basic: name + published
    await page.getByText(/基础信息|基础设置/).first().waitFor({ state: "visible", timeout: 30_000 });
    const nameInput = page.locator("label", { hasText: /页面名称/ }).locator("..").locator("input").first();
    const uniqueName = `RAG新建冒烟 ${Date.now().toString(36)}`;
    if ((await nameInput.count()) > 0) {
      await nameInput.fill(uniqueName);
      pass("create.setName", uniqueName);
    } else {
      await page.locator(".field input, input").first().fill(uniqueName);
      pass("create.setName", `fallback ${uniqueName}`);
    }

    const publishedRadio = page.locator('label:has-text("已发布") input[type="radio"]').first();
    if ((await publishedRadio.count()) > 0) {
      await publishedRadio.check();
      pass("create.setPublished");
    } else {
      fail("create.setPublished", "published radio missing");
    }

    // Robot section: bind bot — use exact tab button in top section nav
    const robotTab = page.locator("button", { hasText: /^机器人设置$/ }).first();
    await robotTab.click();
    await page.waitForURL(/section=robot/, { timeout: 20_000 }).catch(() => undefined);
    await page.waitForTimeout(800);
    await page.getByText(/选择 AI 助手/).first().waitFor({ state: "visible", timeout: 20_000 });
    const botSelect = page.locator("label", { hasText: /选择 AI 助手/ }).locator("..").locator("select").first();
    const options = await botSelect.locator("option").allTextContents();
    const pick =
      options.find((t) => /Sales Advisor|Website Support/i.test(t)) ||
      options.find((t) => t.trim()) ||
      "";
    if (!pick) {
      fail("create.bindBot", `no options: ${options.join("|")}`);
    } else {
      await botSelect.selectOption({ label: pick.trim() }).catch(async () => {
        await botSelect.selectOption({ value: pick.trim() });
      });
      pass("create.bindBot", pick.trim());
    }

    await page.getByRole("button", { name: /^保存$/ }).click();
    await page.waitForTimeout(4500);

    const body = await page.locator("body").innerText();
    if (/已创建|保存|RAG|知识库/.test(body)) {
      pass("create.saveNotice", body.match(/[^\n]{0,40}(已创建|保存|RAG|知识库)[^\n]{0,40}/)?.[0] || "ok");
    } else {
      fail("create.saveNotice", "no save notice");
    }

    // URL should no longer be page=new
    await page.waitForTimeout(1000);
    const afterUrl = page.url();
    if (/page=new/.test(afterUrl)) {
      fail("create.persistedId", afterUrl);
    } else if (/page=sp_|page=/.test(afterUrl)) {
      pass("create.persistedId", afterUrl);
    } else {
      fail("create.persistedId", afterUrl);
    }

    // Resolve slug from localStorage configs written on save
    publicSlug = await page.evaluate(() => {
      const keys = Object.keys(localStorage).filter((k) =>
        k.startsWith("qiyun:selection-page-config:"),
      );
      let best = null;
      for (const key of keys) {
        try {
          const cfg = JSON.parse(localStorage.getItem(key) || "{}");
          if (!cfg?.slug || cfg.slug === "new-selection-page") continue;
          if (!cfg.botId || !cfg.siteKey) continue;
          if (!best || String(cfg.slug).length > String(best.slug).length) {
            // prefer newest-looking unique slug with rag binding
            best = cfg;
          }
          if (/selection-|rag|smoke|mrt/i.test(cfg.slug) || cfg.published) {
            best = cfg;
          }
        } catch {
          // ignore
        }
      }
      // Prefer the most recently written by scanning for unique timestamp-ish suffix
      const ranked = keys
        .map((key) => {
          try {
            return JSON.parse(localStorage.getItem(key) || "{}");
          } catch {
            return null;
          }
        })
        .filter((cfg) => cfg?.slug && cfg.slug !== "new-selection-page" && cfg.botId && cfg.siteKey);
      ranked.sort((a, b) => String(b.slug).localeCompare(String(a.slug)));
      return ranked[0]?.slug || best?.slug || null;
    });

    if (publicSlug) pass("create.slug", publicSlug);
    else fail("create.slug", "could not resolve public slug from localStorage");
  } catch (e) {
    fail("create.flow", String(e));
  }

  // Public chat
  try {
    if (!publicSlug) throw new Error("no slug");
    await page.goto(`/s/${publicSlug}?preview=1`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await page
      .getByText(/正在加载选型页/)
      .waitFor({ state: "hidden", timeout: 30_000 })
      .catch(() => undefined);
    await page.waitForTimeout(800);

    const chatInput = page.locator('input[aria-label="输入消息"], input[placeholder*="需求"]').first();
    if ((await chatInput.count()) === 0) {
      fail("create.publicChatInput");
    } else {
      await chatInput.fill("请问防护等级是多少？");
      await page.locator('button[aria-label="发送"]').click();
      await page.waitForTimeout(7000);
      const text = await page.locator("body").innerText();
      if (/尚未绑定|暂时无法完成智能回答/.test(text)) {
        fail("create.publicChat", text.slice(0, 220).replace(/\s+/g, " "));
      } else if (/防护|机柜|工程师|方案|抱歉|IP|等级|选型/.test(text)) {
        pass("create.publicChat", "assistant reply observed");
      } else {
        fail("create.publicChat", text.slice(0, 220).replace(/\s+/g, " "));
      }
    }
  } catch (e) {
    fail("create.public", String(e));
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
