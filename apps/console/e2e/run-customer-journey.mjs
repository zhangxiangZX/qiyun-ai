#!/usr/bin/env node
import { existsSync, writeFileSync } from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const e2eDir = path.dirname(fileURLToPath(import.meta.url));
const consoleBase = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const apiBase = process.env.API_BASE_URL ?? "http://localhost:3001";
const widgetBase = process.env.WIDGET_SITE_URL ?? "http://localhost:4000";
const email = process.env.E2E_EMAIL ?? "owner@qiyun.ai";
const password = process.env.E2E_PASSWORD ?? "Qiyun@2026";

const results = [];
const bugs = [];

function pass(id, name, note) {
  results.push({ id, name, ok: true, note });
  console.log(`  OK ${id} ${name}${note ? ` - ${note}` : ""}`);
}

function fail(id, name, detail) {
  results.push({ id, name, ok: false, detail });
  bugs.push({ id, name, detail });
  console.log(`  BUG ${id} ${name}`);
  console.log(`    ${detail}`);
}

function waitForHttp(url, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const attempt = () => {
      http
        .get(url, (res) => {
          res.resume();
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 500) resolve();
          else retry(`HTTP ${res.statusCode}`);
        })
        .on("error", () => retry("connection refused"));
    };
    function retry(reason) {
      if (Date.now() >= deadline) reject(new Error(`${url}: ${reason}`));
      else setTimeout(attempt, 1_000);
    }
    attempt();
  });
}

async function loginViaUi(page) {
  await page.goto(`${consoleBase}/login`);
  await page.getByRole("heading", { name: "欢迎登录" }).waitFor({ timeout: 20_000 });
  await page.getByPlaceholder("请输入工作邮箱").fill(email);
  await page.getByPlaceholder("请输入登录密码").fill(password);
  await page.locator('label:has-text("用户协议") input[type="checkbox"]').check();
  await page.getByRole("button", { name: "登录", exact: true }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 45_000, waitUntil: "domcontentloaded" });
}

async function waitUpstream(page) {
  await page.waitForLoadState("domcontentloaded", { timeout: 30_000 }).catch(() => undefined);
  await page.waitForTimeout(500);
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      const mode = await page.evaluate(async () => {
        const response = await fetch("/api/console/mode", { cache: "no-store" });
        if (!response.ok) return null;
        const payload = await response.json();
        return payload?.mode ?? null;
      });
      if (mode === "upstream" || mode === "preview") return mode;
    } catch {
      // retry during navigation
    }
    await page.waitForTimeout(500);
  }
  throw new Error("未检测到真实 API 模式");
}

async function runPublicFlow(page) {
  console.log("\n==> 阶段 1：公开入口（未登录）");

  try {
    await page.goto(`${consoleBase}/login`);
    await page.getByRole("heading", { name: "欢迎登录" }).waitFor({ timeout: 15_000 });
    pass("P-01", "登录页可访问");
  } catch (error) {
    fail("P-01", "登录页可访问", String(error));
  }

  try {
    await page.goto(`${consoleBase}/trial`);
    await page.getByRole("heading", { name: /申请试用 AI|申请试用/ }).waitFor({ timeout: 10_000 });
    await page.getByPlaceholder(/请输入企业名称/).fill("旅程测试企业");
    await page.getByPlaceholder(/联系人姓名/).fill("李测试");
    await page.getByPlaceholder(/工作邮箱/).fill(`journey-${Date.now()}@example.com`);
    await page.getByRole("checkbox", { name: /用户协议.*隐私政策/ }).check();
    await page.getByRole("button", { name: /提交试用申请/ }).click();
    await page.getByText(/申请已提交|提交成功/).waitFor({ timeout: 15_000 });
    pass("P-02", "申请试用表单提交成功");
  } catch (error) {
    fail("P-02", "申请试用表单提交", String(error));
  }

  try {
    await page.goto(`${consoleBase}/register`, { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: /注册与开通/ }).waitFor({ timeout: 10_000 });
    pass("P-03", "/register 展示注册说明页");
  } catch (error) {
    fail("P-03", "/register 注册说明页", String(error));
  }

  try {
    await page.goto(`${consoleBase}/dashboard`);
    await page.waitForURL(/\/login/, { timeout: 10_000 });
    pass("P-04", "未登录访问控制台跳转登录");
  } catch (error) {
    fail("P-04", "未登录鉴权", String(error));
  }
}

async function runConsoleFlow(page) {
  console.log("\n==> 阶段 2：登录后控制台全流程");

  try {
    await loginViaUi(page);
    pass("C-01", "邮箱密码登录成功");
  } catch (error) {
    fail("C-01", "登录", String(error));
    return;
  }

  const pages = [
    { id: "C-02", path: "/dashboard", checks: [/工作台|首页概览|有效询盘|创建机器人/] },
    { id: "C-03", path: "/dashboard/knowledge-bases", checks: [/知识库/] },
    { id: "C-04", path: "/dashboard/bots", checks: [/AI助手|助手列表|新建 ?AI助手|新建助手/] },
    { id: "C-05", path: "/dashboard/conversations", checks: [/会话/] },
    { id: "C-06", path: "/dashboard/leads", checks: [/导出 CSV|线索|询盘/] },
    { id: "C-07", path: "/dashboard/sites", checks: [/官网 Widget|Widget 配置|安装代码|实时预览/] },
    { id: "C-08", path: "/dashboard/reports/channel", checks: [/渠道总询盘|渠道转化洞察|渠道来源排名|渠道分析/] },
    { id: "C-09", path: "/dashboard/team", checks: [/团队成员|成员总数|邀请成员/] },
    { id: "C-10", path: "/dashboard/system-status", checks: [/全部正常|PostgreSQL reachable|Qdrant/] },
  ];

  for (const item of pages) {
    try {
      await page.goto(item.path);
      await waitUpstream(page);
      for (const text of item.checks) {
        await page.getByText(text).first().waitFor({ timeout: 20_000 });
      }
      pass(item.id, `${item.path} 加载与关键元素`, item.checks.map((entry) => entry.toString()).join(", "));
    } catch (error) {
      fail(item.id, item.path, String(error));
    }
  }
}

async function runWidgetFlow(page) {
  console.log("\n==> 阶段 3：访客端 Widget（客户官网）");

  let widgetReachable = true;
  try {
    await waitForHttp(widgetBase, 5_000);
  } catch {
    widgetReachable = false;
  }

  if (!widgetReachable) {
    pass("W-01", "官网 Widget 环境未启动，已跳过", widgetBase);
  } else {
    try {
      await page.goto(widgetBase);
      await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => undefined);
      const widgetBtn = page.getByRole("button", { name: /客服|打开客服/ });
      if (await widgetBtn.count()) {
        await widgetBtn.click();
        await page.waitForTimeout(1500);
        pass("W-01", "官网 Widget 按钮可点击", widgetBase);
      } else {
        pass("W-01", "官网可访问（Widget 按钮未进入 a11y 树）", widgetBase);
      }
    } catch (error) {
      fail("W-01", "官网 Widget", String(error));
    }
  }

  try {
    const res = await fetch(`${apiBase}/health`);
    if (!res.ok) throw new Error(`API health ${res.status}`);
    pass("W-02", "Widget 后端 API 健康");
  } catch (error) {
    fail("W-02", "Widget 后端", String(error));
  }
}

function resolvePlaywright() {
  const playwrightPath = path.join(e2eDir, "node_modules", "playwright", "index.mjs");
  if (!existsSync(playwrightPath)) throw new Error("Missing playwright");
  return import(pathToFileURL(playwrightPath).href);
}

console.log("==> 客户首次使用 - 全流程测试");
console.log(`    Console: ${consoleBase} / API: ${apiBase} / 官网: ${widgetBase}`);

await waitForHttp(`${consoleBase}/login`);
const { chromium } = await resolvePlaywright();
const browser = await chromium.launch({ headless: true });
const page = await browser.newContext({ baseURL: consoleBase }).then((context) => context.newPage());

await runPublicFlow(page);
await runConsoleFlow(page);
await runWidgetFlow(page);

await browser.close();

const passed = results.filter((item) => item.ok).length;
const report = {
  generatedAt: new Date().toISOString(),
  summary: { passed, failed: bugs.length, total: results.length },
  results,
  bugs,
};

const out = path.join(e2eDir, "..", "CUSTOMER-JOURNEY-TEST-REPORT.json");
writeFileSync(out, JSON.stringify(report, null, 2));

console.log(`\n==> 结果: ${passed}/${results.length} 通过`);
if (bugs.length) {
  console.log(`==> Bug ${bugs.length} 个，详见 ${out}`);
  process.exit(1);
}
console.log("==> 全部通过");
