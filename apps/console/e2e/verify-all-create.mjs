import { chromium } from "@playwright/test";

const BASE = "http://127.0.0.1:3000";

async function apiLogin(page) {
  const res = await page.request.post(`${BASE}/api/auth/login`, {
    headers: { "Content-Type": "application/json" },
    data: { email: "owner@qiyun.ai", password: "Qiyun@2026" },
  });
  const setCookie = res.headers()["set-cookie"] || "";
  const cookie = setCookie.split(";")[0];
  if (cookie) {
    const [name, value] = cookie.split("=");
    await page.context().addCookies([{ name, value, url: BASE }]);
  }
}

// 轮询等待按钮出现
async function waitButton(page, name, tries = 12) {
  for (let i = 0; i < tries; i++) {
    await page.waitForTimeout(800);
    if (await page.getByRole("button", { name, exact: false }).count() > 0) return true;
  }
  return false;
}

async function openDemoDialog(page, path, trigger, hint) {
  await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: 30000 });
  const ok = await waitButton(page, trigger);
  if (!ok) return { path, trigger, ok: false, detail: "button NOT FOUND" };
  await page.getByRole("button", { name: trigger, exact: false }).first().click();
  await page.waitForTimeout(900);
  const inputs = await page.locator("input,textarea,select").count();
  const hasHint = (await page.getByText(hint, { exact: false }).count()) > 0;
  await page.keyboard.press("Escape").catch(() => {});
  await page.waitForTimeout(300);
  return { path, trigger, ok: inputs > 0 || hasHint, detail: `inputs=${inputs},hint=${hasHint}` };
}

const results = [];

(async () => {
  const b = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, baseURL: BASE });
  const page = await ctx.newPage();
  await apiLogin(page);

  results.push(await openDemoDialog(page, "/dashboard/customers", "新建客户", "演示模式"));
  results.push(await openDemoDialog(page, "/dashboard/quotes", "新建报价", "演示模式"));
  results.push(await openDemoDialog(page, "/dashboard/inquiries", "新建询盘", "演示模式"));
  results.push(await openDemoDialog(page, "/dashboard/leads", "新建线索", "演示模式"));
  results.push(await openDemoDialog(page, "/dashboard/settings/business-rules", "新建规则", "演示模式"));
  results.push(await openDemoDialog(page, "/dashboard/sites", "接入新站点", "演示模式"));
  results.push(await openDemoDialog(page, "/dashboard/bots?tab=landing", "新建选型页", "演示模式"));

  // 机器人：真实 dialog（不导航验证，只确认弹窗可开）
  await page.goto(`${BASE}/dashboard/bots`, { waitUntil: "domcontentloaded", timeout: 30000 });
  const botOk = await waitButton(page, "创建新助手");
  if (botOk) {
    await page.getByRole("button", { name: "创建新助手", exact: false }).first().click();
    await page.waitForTimeout(900);
    const inputs = await page.locator("input,textarea,select").count();
    results.push({ path: "/dashboard/bots", trigger: "创建新助手", ok: inputs > 0, detail: `inputs=${inputs}` });
    await page.keyboard.press("Escape").catch(() => {});
    await page.waitForTimeout(300);
  } else {
    results.push({ path: "/dashboard/bots", trigger: "创建新助手", ok: false, detail: "button NOT FOUND" });
  }

  // 复购：首行默认选中，侧栏"创建跟进任务"加载即可见
  await page.goto(`${BASE}/dashboard/customers/repurchase`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(2500);
  let repOk = false, repDetail = "";
  const tBtn = page.getByRole("button", { name: "创建跟进任务", exact: false });
  if (await tBtn.count() > 0) {
    await tBtn.first().click();
    await page.waitForTimeout(900);
    const inputs = await page.locator("input,textarea,select").count();
    repOk = inputs > 0;
    repDetail = `inputs=${inputs}`;
  } else {
    repDetail = "task button NOT FOUND on load";
  }
  results.push({ path: "/dashboard/customers/repurchase", trigger: "创建跟进任务", ok: repOk, detail: repDetail });

  console.log("=== RESULTS ===");
  for (const r of results) console.log(JSON.stringify(r));
  const passed = results.filter((r) => r.ok).length;
  console.log(`=== PASSED ${passed}/${results.length} ===`);
  await b.close();
  process.exit(0);
})();
