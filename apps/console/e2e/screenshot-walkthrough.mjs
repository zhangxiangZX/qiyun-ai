/**
 * 视觉走查 · 关键页面真实截图
 * 使用 Playwright（仓库内置 e2e 工具）对关键页面逐页全屏截图。
 *
 * 登录策略：直接调用 /api/auth/login 拿到会话 Cookie 并注入浏览器上下文，
 * 绕过易被合成事件干扰的登录表单（受控 input + 协议勾选）。
 *
 * 前置：
 *   1. dev server 运行于 http://127.0.0.1:3000 （upstream 模式，apps/api 在 3001）
 *   2. 已安装 chromium：node e2e/node_modules/playwright/cli.js install chromium
 *
 * 运行：
 *   node e2e/screenshot-walkthrough.mjs
 */
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const e2eDir = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(e2eDir, "screenshots");
mkdirSync(outDir, { recursive: true });

const BASE_URL = process.env.WALKTHROUGH_BASE_URL ?? "http://127.0.0.1:3000";
const EMAIL = process.env.E2E_EMAIL ?? "owner@qiyun.ai";
const PASSWORD = process.env.E2E_PASSWORD ?? "Qiyun@2026";

// 关键页面（含本轮 P1 整改页：渠道接入 / 客户详情 / 工单中心）
const PAGES = [
  { slug: "01-dashboard", path: "/dashboard", label: "首页概览" },
  { slug: "02-sales-funnel", path: "/dashboard/sales", label: "成交漏斗" },
  { slug: "03-inquiries", path: "/dashboard/inquiries", label: "询盘中心" },
  { slug: "04-quotes", path: "/dashboard/quotes", label: "报价管理" },
  { slug: "05-leads", path: "/dashboard/leads", label: "跟进任务" },
  { slug: "06-bots", path: "/dashboard/bots", label: "助手列表" },
  { slug: "07-conversations", path: "/dashboard/conversations", label: "对话测试" },
  { slug: "08-knowledge", path: "/dashboard/knowledge-bases", label: "知识库" },
  { slug: "09-sites", path: "/dashboard/sites", label: "官网 Widget" },
  { slug: "10-channels", path: "/dashboard/channels", label: "渠道接入（P1整改）" },
  { slug: "11-reports", path: "/dashboard/reports", label: "渠道转化数据" },
  { slug: "12-customers", path: "/dashboard/customers", label: "客户档案" },
  { slug: "13-customer-detail", path: "/dashboard/customers/detail", label: "客户详情（P1空Tab）" },
  { slug: "14-tickets", path: "/dashboard/tickets", label: "工单中心（P1新增）" },
  { slug: "15-customer-ops", path: "/dashboard/customers/ops", label: "客户运营" },
  { slug: "16-team", path: "/dashboard/team", label: "团队成员" },
];

/** 通过 API 登录，解析 Set-Cookie 并返回 Playwright 可用 cookie 列表。 */
async function apiLogin() {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`登录接口返回 ${res.status}: ${body.slice(0, 200)}`);
  }
  const rawCookies = typeof res.headers.getSetCookie === "function"
    ? res.headers.getSetCookie()
    : [res.headers.get("set-cookie")].filter(Boolean);
  const cookies = rawCookies.map((c) => {
    const parts = c.split(";").map((s) => s.trim());
    const [name, ...valueParts] = parts[0].split("=");
    const httpOnly = parts.some((p) => p.toLowerCase() === "httponly");
    return {
      name: name.trim(),
      value: valueParts.join("=").trim(),
      domain: "127.0.0.1",
      path: "/",
      httpOnly,
    };
  });
  return cookies;
}

async function main() {
  console.log(`[walkthrough] API 登录 ${BASE_URL}`);
  const cookies = await apiLogin();
  console.log(`[walkthrough] 登录成功，拿到 ${cookies.length} 个会话 Cookie`);

  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    baseURL: BASE_URL,
  });
  await context.addCookies(cookies);
  const page = await context.newPage();
  page.setDefaultTimeout(30_000);

  const results = [];
  try {
    // 验证会话已生效
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => undefined);
    await page.waitForTimeout(1500);
    console.log("[walkthrough] 进入控制台，开始逐页截图");

    for (const item of PAGES) {
      const file = path.join(outDir, `${item.slug}.png`);
      try {
        await page.goto(item.path, { waitUntil: "domcontentloaded" });
        await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => undefined);
        await page.waitForTimeout(1500);
        await page.screenshot({ path: file, fullPage: true });
        results.push({ ...item, file: path.basename(file), ok: true });
        console.log(`  ✓ ${item.label.padEnd(28)} → ${path.basename(file)}`);
      } catch (err) {
        results.push({ ...item, ok: false, error: String(err).split("\n")[0] });
        console.log(`  ✗ ${item.label.padEnd(28)} → 失败：${String(err).split("\n")[0]}`);
      }
    }
  } catch (err) {
    console.error("[walkthrough] 致命错误（进入控制台失败）:", err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }

  const okCount = results.filter((r) => r.ok).length;
  console.log(`\n[walkthrough] 完成 ${okCount}/${results.length} 页，输出目录：e2e/screenshots/`);
}

main();
