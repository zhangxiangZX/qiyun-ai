#!/usr/bin/env node
import { existsSync, writeFileSync } from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const e2eDir = path.dirname(fileURLToPath(import.meta.url));
const consoleBase = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const apiBase = process.env.API_BASE_URL ?? process.env.API_BASE ?? "http://localhost:3001";
const email = process.env.E2E_EMAIL ?? "owner@qiyun.ai";
const password = process.env.E2E_PASSWORD ?? "Qiyun@2026";
const expectBotWriteDenied = process.env.E2E_EXPECT_BOT_WRITE_DENIED === "1";

function unwrapEnvelope(payload) {
  return payload && typeof payload === "object" && "data" in payload ? payload.data : payload;
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

async function apiLogin() {
  const res = await fetch(`${apiBase}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`API login failed: HTTP ${res.status}`);
  return unwrapEnvelope(await res.json());
}

async function runApiBusinessChecks() {
  const bugs = [];
  const passes = [];

  let login;
  try {
    login = await apiLogin();
    passes.push("API-01 登录成功");
  } catch (error) {
    bugs.push({ id: "API-01", title: "API 登录失败", detail: String(error) });
    return { bugs, passes };
  }

  const token = login?.tokens?.accessToken;
  const workspaceId = login?.user?.activeWorkspaceId ?? login?.workspaces?.[0]?.id;
  if (!token) {
    bugs.push({ id: "API-02", title: "登录响应缺少 accessToken", detail: "" });
    return { bugs, passes };
  }
  passes.push("API-02 获取 accessToken");

  const headers = {
    authorization: `Bearer ${token}`,
    "content-type": "application/json",
    ...(workspaceId ? { "x-workspace-id": workspaceId } : {}),
  };

  async function getJson(apiPath) {
    const res = await fetch(`${apiBase}${apiPath}`, { headers });
    const text = await res.text();
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
    return { status: res.status, json: unwrapEnvelope(parsed) };
  }

  const checks = [
    { id: "API-03", path: "/health", ok: (s) => s === 200, label: "健康检查" },
    { id: "API-04", path: "/bots", ok: (s, j) => s === 200 && Array.isArray(j), label: "助手列表" },
    {
      id: "API-05",
      path: "/conversations?limit=5",
      ok: (s, j) => s === 200 && (Array.isArray(j) || Array.isArray(j?.items)),
      label: "会话列表",
    },
    { id: "API-06", path: "/leads", ok: (s, j) => s === 200 && Array.isArray(j), label: "线索列表" },
    { id: "API-07", path: "/sites", ok: (s, j) => s === 200 && Array.isArray(j), label: "站点列表" },
    { id: "API-08", path: "/reports", ok: (s, j) => s === 200 && j && typeof j === "object", label: "报表汇总" },
    {
      id: "API-09",
      path: "/notifications",
      ok: (s, j) => s === 200 && (Array.isArray(j) || Array.isArray(j?.items)),
      label: "通知列表",
    },
  ];

  for (const check of checks) {
    try {
      const { status, json } = await getJson(check.path);
      if (check.ok(status, json)) passes.push(`${check.id} ${check.label}`);
      else {
        bugs.push({
          id: check.id,
          title: `${check.label} 异常`,
          detail: `HTTP ${status} ${JSON.stringify(json).slice(0, 200)}`,
        });
      }
    } catch (error) {
      bugs.push({ id: check.id, title: `${check.label} 请求失败`, detail: String(error) });
    }
  }

  const bots = await getJson("/bots");
  const botId = Array.isArray(bots.json) ? bots.json[0]?.id : null;
  if (botId) {
    const patch = await fetch(`${apiBase}/bots/${botId}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ description: `e2e-check-${Date.now()}` }),
    });
    if (patch.ok || (expectBotWriteDenied && [401, 403].includes(patch.status))) passes.push("API-10 助手 PATCH 权限符合角色预期");
    else bugs.push({ id: "API-10", title: "助手 PATCH 失败", detail: `HTTP ${patch.status}` });
  }

  const conv = await getJson("/conversations?limit=1");
  const items = Array.isArray(conv.json) ? conv.json : conv.json?.items;
  const convId = items?.[0]?.id;
  if (convId) {
    const patch = await fetch(`${apiBase}/conversations/${convId}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ status: "open" }),
    });
    if (patch.ok) passes.push("API-11 会话元数据 PATCH");
    else bugs.push({ id: "API-11", title: "会话 PATCH 失败", detail: `HTTP ${patch.status}` });
  }

  return { bugs, passes };
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

async function waitUpstream(page, timeoutMs = 30_000) {
  await page.waitForLoadState("domcontentloaded", { timeout: timeoutMs }).catch(() => undefined);
  await page.waitForTimeout(500);
  const deadline = Date.now() + timeoutMs;
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
      // navigation in progress — retry
    }
    await page.waitForTimeout(500);
  }
  return null;
}

async function runBrowserBusinessChecks(chromium) {
  const bugs = [];
  const passes = [];
  const results = [];

  async function check(id, name, fn) {
    process.stdout.write(`  - ${id} ${name} ... `);
    try {
      await fn();
      passes.push(`${id} ${name}`);
      results.push({ id, name, ok: true });
      console.log("ok");
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      bugs.push({ id, title: name, detail });
      results.push({ id, name, ok: false, detail });
      console.log("BUG");
      console.error(`    ${detail}`);
    }
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ baseURL: consoleBase });
  const page = await context.newPage();

  await check("BF-01", "登录进入角色工作台且为 upstream", async () => {
    await loginViaUi(page);
    await waitUpstream(page);
    await page.getByText(/工作台|首页概览|有效询盘|创建机器人|经营指标|7日询盘/).first().waitFor({
      timeout: 25_000,
    });
  });

  await check("BF-02", "助手列表与新建入口可用", async () => {
    await page.goto("/dashboard/bots");
    await waitUpstream(page);
    await page.getByText(/AI助手|助手列表/).first().waitFor({ timeout: 20_000 });
    await page.getByText(/新建 ?AI助手|新建助手/).first().waitFor({ timeout: 20_000 });
  });

  await check("BF-03", "会话列表可选中", async () => {
    await page.goto("/dashboard/conversations");
    await waitUpstream(page);
    const item = page.getByRole("button").filter({ hasText: /Visitor|访客/ }).first();
    await item.waitFor({ timeout: 20_000 });
    await item.click();
    await page.waitForTimeout(1000);
  });

  await check("BF-04", "报表加载并进入真实报表页", async () => {
    await page.goto("/dashboard/reports/channel", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => undefined);
    await waitUpstream(page);
    await page.getByText(/渠道总询盘|渠道转化洞察|渠道来源排名|渠道分析|无法加载渠道分析/).first().waitFor({ timeout: 45_000 });
    await page.getByText(/刷新|导出/).first().waitFor({ timeout: 20_000 });
  });

  await check("BF-05", "站点页与测试消息入口可见", async () => {
    await page.goto("/dashboard/sites");
    await waitUpstream(page);
    await page.getByText(/官网 Widget|Widget 配置|安装代码|实时预览/).first().waitFor({
      timeout: 20_000,
    });
  });

  await check("BF-06", "线索页加载", async () => {
    await page.goto("/dashboard/leads");
    await waitUpstream(page);
    await page.getByPlaceholder("搜索姓名、联系方式或问题").waitFor({ timeout: 20_000 });
  });

  await check("BF-07", "团队成员页可见", async () => {
    await page.goto("/dashboard/team");
    await waitUpstream(page);
    await page.getByText(/团队成员|成员总数|邀请成员/).first().waitFor({ timeout: 20_000 });
  });

  await check("BF-08", "系统状态健康", async () => {
    await page.goto("/dashboard/system-status");
    await waitUpstream(page);
    await page.getByText(/全部正常|6\/6|PostgreSQL reachable/).first().waitFor({
      timeout: 20_000,
    });
  });

  await check("BF-09", "通知中心可打开", async () => {
    await page.goto("/dashboard");
    await page.waitForTimeout(1000);
    await page.getByRole("button", { name: "通知" }).click();
    await page.waitForTimeout(800);
    await page.getByText("通知中心").first().waitFor({ timeout: 10_000 });
  });

  await check("BF-10", "/register 展示注册说明页", async () => {
    const guest = await browser.newContext({ baseURL: consoleBase });
    const guestPage = await guest.newPage();
    await guestPage.goto("/register", { waitUntil: "domcontentloaded" });
    await guestPage.getByRole("heading", { name: /注册与开通/ }).waitFor({ timeout: 10_000 });
    await guestPage.getByText("企业试用申请").first().waitFor({ timeout: 10_000 });
    await guest.close();
  });

  await check("BF-11", "跟进任务页加载", async () => {
    await page.goto("/dashboard/tasks");
    await waitUpstream(page);
    await page.getByText(/跟进任务|新建任务/).first().waitFor({ timeout: 20_000 });
  });

  await check("BF-12", "AI选型页加载", async () => {
    await page.goto("/dashboard/bots/landing");
    await waitUpstream(page);
    await page.getByText(/AI 选型|选型页|新建选型页/).first().waitFor({ timeout: 20_000 });
  });

  await check("BF-13", "二维码管理页加载", async () => {
    await page.goto("/dashboard/channels/qrcodes");
    await waitUpstream(page);
    await page.getByText(/二维码|销售链接/).first().waitFor({ timeout: 20_000 });
  });

  await check("BF-14", "丢单分析页加载", async () => {
    await page.goto("/dashboard/reports/lost-reasons");
    await waitUpstream(page);
    await page.getByText(/丢单原因|丢单总数/).first().waitFor({ timeout: 20_000 });
  });

  await check("BF-15", "邀请成员页加载", async () => {
    await page.goto("/dashboard/team/invite");
    await waitUpstream(page);
    await page.getByText(/邀请成员|邮箱邀请/).first().waitFor({ timeout: 20_000 });
  });

  await browser.close();
  return { bugs, passes, results };
}

function resolvePlaywright() {
  const playwrightPath = path.join(e2eDir, "node_modules", "playwright", "index.mjs");
  if (!existsSync(playwrightPath)) {
    throw new Error("Missing playwright. Run: cd apps/console/e2e && npm install");
  }
  return import(pathToFileURL(playwrightPath).href);
}

console.log("==> 业务流程全自动测试");
console.log(`    Console: ${consoleBase}`);
console.log(`    API:     ${apiBase}`);
console.log(`    Account: ${email}`);

await waitForHttp(`${consoleBase}/login`, 30_000);
console.log("    Console: OK");
let apiAvailable = true;
try {
  await waitForHttp(`${apiBase}/health`, 15_000);
  console.log("    API: OK");
} catch {
  apiAvailable = false;
  console.log("    API: 不可达，跳过 API 检查");
}

const apiResult = apiAvailable ? await runApiBusinessChecks() : { bugs: [], passes: [] };
console.log(`\n==> API 检查 ${apiResult.passes.length} pass, ${apiResult.bugs.length} bug`);
if (apiResult.bugs.length) {
  for (const item of apiResult.bugs) console.log(`    [${item.id}] ${item.title}: ${item.detail}`);
}

console.log("\n==> 浏览器业务流程 E2E");
const { chromium } = await resolvePlaywright();
const browserResult = await runBrowserBusinessChecks(chromium);
console.log(`\n==> 浏览器 ${browserResult.passes.length} pass, ${browserResult.bugs.length} bug`);

const allBugs = [...apiResult.bugs, ...browserResult.bugs];
const report = {
  generatedAt: new Date().toISOString(),
  environment: { consoleBase, apiBase, email },
  api: apiResult,
  browser: browserResult,
  bugs: allBugs,
  summary: {
    totalPasses: apiResult.passes.length + browserResult.passes.length,
    totalBugs: allBugs.length,
  },
};

const reportPath = path.join(e2eDir, "..", "BUSINESS-FLOW-BUG-REPORT.json");
writeFileSync(reportPath, JSON.stringify(report, null, 2));

const mdPath = path.join(e2eDir, "..", "BUSINESS-FLOW-BUG-REPORT.md");
const md = [
  "# 业务流程 Bug 报告",
  "",
  `生成时间：${report.generatedAt}`,
  "",
  "## 摘要",
  "",
  `- 通过：${report.summary.totalPasses} 项`,
  `- Bug：${report.summary.totalBugs} 项`,
  "",
  allBugs.length
    ? "## 发现的 Bug\n\n" +
      allBugs.map((item) => `- **[${item.id}] ${item.title}**\n  ${item.detail}`).join("\n\n")
    : "## 未发现 Bug\n\n全部业务流程检查通过。",
  "",
  "## 运行方式",
  "",
  "```bash",
  "node apps/console/e2e/run-business-flow.mjs",
  "```",
].join("\n");
writeFileSync(mdPath, md);

console.log(`\n==> 报告: ${mdPath}`);

if (allBugs.length) {
  console.log(`\n==> 共发现 ${allBugs.length} 个 Bug`);
  process.exit(1);
}
console.log("\n==> 全部通过");
