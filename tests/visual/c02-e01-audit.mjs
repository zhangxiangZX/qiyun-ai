/**
 * C-02 / J-01 / E-01 视觉验收 + 基线落盘
 * 输出：tests/visual/reports/YYYY-MM-DD/ 与 tests/visual/baselines/
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const DATE = new Date().toISOString().slice(0, 10);
const OUT = path.resolve(`visual/reports/${DATE}`);
const BASELINES = path.resolve("visual/baselines");
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
      };
    };
    const sidebar = document.querySelector(".console-sidebar-slot");
    const content = document.querySelector(".content");
    const rightAside = document.querySelector("aside");
    const emptyCompleteness = document.querySelectorAll("[class*='completenessEmpty']").length;
    const bars = document.querySelectorAll("[class*='completenessBar']").length;
    const banner = document.querySelector("[role='status']");
    const hScroll = document.documentElement.scrollWidth > document.documentElement.clientWidth;
    const pageFlex = (() => {
      const page = document.querySelector("[class*='page']");
      return page ? getComputedStyle(page).flexDirection : null;
    })();
    return {
      viewport: { w: window.innerWidth, h: window.innerHeight },
      horizontalScroll: hScroll,
      sidebar: pick(sidebar),
      content: pick(content),
      rightAside: pick(rightAside),
      pageFlexDirection: pageFlex,
      completenessEmptyCount: emptyCompleteness,
      completenessBarCount: bars,
      bannerText: banner?.textContent?.trim() ?? null,
      bodyFont: getComputedStyle(document.body).fontFamily,
      title: document.querySelector("h1")?.textContent?.trim() ?? null,
    };
  });
}

async function shotPage(page, prefix, report) {
  for (const vp of VIEWPORTS) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.waitForTimeout(700);
    const file = `${prefix}-${vp.name}.png`;
    const shotPath = path.join(OUT, file);
    await page.screenshot({ path: shotPath, fullPage: false });
    report.shots.push(file);
    report.metrics[`${prefix}:${vp.name}`] = await collectMetrics(page);

    // 仅当 UPDATE_BASELINES=1 时写入基线（避免每次覆盖）
    if (vp.name === "1920x1080" && process.env.UPDATE_BASELINES === "1") {
      const baseFile = `${prefix}-1920x1080.png`;
      fs.copyFileSync(shotPath, path.join(BASELINES, baseFile));
      report.baselines.push(baseFile);
    }
  }
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  fs.mkdirSync(BASELINES, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ locale: "zh-CN" });
  const page = await context.newPage();
  const report = {
    capturedAt: new Date().toISOString(),
    shots: [],
    baselines: [],
    metrics: {},
  };

  try {
    await login(page);

    await page.goto(`${BASE}/dashboard/inquiries`, { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForTimeout(1200);
    await shotPage(page, "c02-inquiries", report);

    await page.goto(`${BASE}/dashboard/bots`, { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForTimeout(1200);
    await shotPage(page, "e01-bots", report);

    fs.writeFileSync(path.join(OUT, "metrics.json"), JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ ok: true, out: OUT, baselines: report.baselines, shots: report.shots.length }, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
