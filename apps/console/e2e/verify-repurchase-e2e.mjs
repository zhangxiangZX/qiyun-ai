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

(async () => {
  const b = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, baseURL: BASE });
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  await apiLogin(page);

  await page.goto(`${BASE}/dashboard/customers/repurchase`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(3000);

  const rowCountBefore = await page.locator("table tbody tr").count();
  console.log("LIST_ROWS_BEFORE:", rowCountBefore);

  // 打开"创建跟进任务"（首行默认选中，侧栏按钮可见）
  await page.getByRole("button", { name: "创建跟进任务", exact: false }).first().click();
  await page.waitForTimeout(900);

  const inputs = await page.locator("input,textarea,select").count();
  console.log("TASK_FORM_INPUTS:", inputs);

  // 弹窗容器：fixed 遮罩
  const overlay = page.locator("div[style*='position: fixed']").last();
  // 填表：客户名称 + 内容 + 计划时间（限定在弹窗内，避开页面顶部搜索框）
  const customerInput = overlay.getByPlaceholder("例如：华东制造");
  await customerInput.fill("测试复购客户_环网柜厂").catch(() => {});
  const ta = overlay.locator("textarea").first();
  await ta.fill("跟进本年度第二批环网柜采购，确认交期与配置").catch(() => {});
  const dateInput = overlay.locator("input[type=date]").first();
  await dateInput.fill("2026-07-20").catch(() => {});
  await page.waitForTimeout(400);

  const createBtn = overlay.getByRole("button", { name: "创建", exact: false });
  const disabled = await createBtn.isDisabled().catch(() => null);
  console.log("CREATE_DISABLED_AFTER_FILL:", disabled);

  await createBtn.click().catch(() => {});
  await page.waitForTimeout(1000);

  const rowCountAfter = await page.locator("table tbody tr").count();
  const body = await page.locator("body").innerText();
  console.log("LIST_ROWS_AFTER:", rowCountAfter);
  console.log("NEW_TASK_IN_LIST:", body.includes("测试复购客户_环网柜厂"));
  console.log("CONSOLE_ERRORS:", JSON.stringify(errors.slice(0, 5)));
  await b.close();
  process.exit(0);
})();
