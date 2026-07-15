/**
 * C-02 询盘中心 + J-01 侧栏 · 首轮视觉验收（一次性脚本）
 * 输出：tests/visual/reports/2026-07-13/
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const OUT = path.resolve("visual/reports/2026-07-13");
const EMAIL = process.env.E2E_EMAIL ?? "owner@qiyun.ai";
const PASSWORD = process.env.E2E_PASSWORD ?? "Qiyun@2026";

const VIEWPORTS = [
  { name: "1920x1080", width: 1920, height: 1080 },
  { name: "1440x900", width: 1440, height: 900 },
  { name: "1366x768", width: 1366, height: 768 },
];

async function login(page) {
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "欢迎登录" }).waitFor({ timeout: 20000 });
  await page.getByPlaceholder("请输入工作邮箱").fill(EMAIL);
  await page.getByPlaceholder("请输入登录密码").fill(PASSWORD);
  const agree = page.locator('label:has-text("用户协议") input[type="checkbox"]');
  if (await agree.count()) await agree.check();
  await page.getByRole("button", { name: "登录", exact: true }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 45000 });
}

async function collectMetrics(page) {
  return page.evaluate(() => {
    const pick = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        w: Math.round(r.width),
        h: Math.round(r.height),
        x: Math.round(r.x),
        y: Math.round(r.y),
        fontFamily: cs.fontFamily,
        fontSize: cs.fontSize,
        fontWeight: cs.fontWeight,
        color: cs.color,
        backgroundColor: cs.backgroundColor,
        padding: cs.padding,
        borderRadius: cs.borderRadius,
      };
    };

    const sidebar = document.querySelector(".console-sidebar-slot");
    const main = document.querySelector(".console-main-slot");
    const content = document.querySelector(".content");
    const activeSub = document.querySelector(".nav-subitem.active");
    const navIcons = [...document.querySelectorAll(".nav-group-toggle i svg, .nav-standalone-link i svg")].slice(0, 7);
    const iconSizes = navIcons.map((svg) => {
      const r = svg.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height) };
    });

    const hScroll = document.documentElement.scrollWidth > document.documentElement.clientWidth;
    const pageTitle = document.querySelector("h1, [class*='page-title'], .console-page-title");
    const table = document.querySelector("table, [role='table'], .inquiry-table");

    return {
      viewport: { w: window.innerWidth, h: window.innerHeight },
      horizontalScroll: hScroll,
      sidebar: pick(sidebar),
      main: pick(main),
      content: pick(content),
      activeNavItem: pick(activeSub),
      iconSizes,
      pageTitle: pageTitle ? { text: pageTitle.textContent?.trim(), ...pick(pageTitle) } : null,
      table: table ? pick(table) : null,
      bodyFont: getComputedStyle(document.body).fontFamily,
    };
  });
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ locale: "zh-CN" });
  const page = await context.newPage();
  const report = { capturedAt: new Date().toISOString(), viewports: {}, metrics: {} };

  try {
    await login(page);
    await page.goto(`${BASE}/dashboard/inquiries`, { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForTimeout(1500);

    for (const vp of VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.waitForTimeout(800);
      const shot = path.join(OUT, `c02-inquiries-${vp.name}.png`);
      await page.screenshot({ path: shot, fullPage: false });
      report.viewports[vp.name] = { screenshot: path.basename(shot) };
      report.metrics[vp.name] = await collectMetrics(page);
    }

    // Sidebar collapsed
    const collapseBtn = page.locator('button[aria-label*="收起"], button[aria-label*="折叠"], .sidebar-collapse, [data-sidebar-collapse]').first();
    if (await collapseBtn.count()) {
      await collapseBtn.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(OUT, "j01-sidebar-collapsed.png") });
      report.sidebarCollapsed = true;
    } else {
      report.sidebarCollapsed = "no-toggle-found";
    }

    // Filter panel if present
    const filterBtn = page.getByRole("button", { name: /筛选/ }).first();
    if (await filterBtn.count()) {
      await filterBtn.click();
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(OUT, "c02-inquiries-filter-open.png") });
    }

    fs.writeFileSync(path.join(OUT, "metrics.json"), JSON.stringify(report, null, 2));
    console.log("OK", OUT);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
