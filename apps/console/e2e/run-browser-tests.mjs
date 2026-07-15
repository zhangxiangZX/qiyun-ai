import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import http from "node:http";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  assertAgreementBeforeSubmit,
  mockAuthLoginFailure,
  mockAuthLoginSuccess,
  mockAuthRegisterSuccess,
  mockPasswordResetConfirm,
  mockPasswordResetRequest,
  mockTrialRequestSuccess,
} from "./helpers/auth-mock.mjs";

const e2eDir = path.dirname(fileURLToPath(import.meta.url));
const consoleRoot = path.resolve(e2eDir, "..");
const port = process.env.PLAYWRIGHT_PORT ?? "3000";
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${port}`;

function waitForHttp(url, timeoutMs = 120_000) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const request = http.get(url, (response) => {
        response.resume();
        if (response.statusCode && response.statusCode >= 200 && response.statusCode < 500) {
          resolve(undefined);
          return;
        }
        retry(`Unexpected status ${response.statusCode}`);
      });
      request.on("error", () => retry("Connection failed"));
      function retry(reason) {
        if (Date.now() >= deadline) reject(new Error(`Timed out waiting for ${url}: ${reason}`));
        else setTimeout(attempt, 1_000);
      }
    };
    attempt();
  });
}

async function startDevServer() {
  try {
    await waitForHttp(`${baseURL}/login`, 3_000);
    console.log(`==> reusing dev server ${baseURL}`);
    return null;
  } catch {
    console.log(`==> starting next dev on port ${port}`);
  }

  const child = spawn(
    process.platform === "win32" ? "cmd.exe" : "pnpm",
    process.platform === "win32"
      ? ["/d", "/s", "/c", "pnpm", "exec", "next", "dev", "--port", port]
      : ["exec", "next", "dev", "--port", port],
    {
      cwd: consoleRoot,
      stdio: "inherit",
      env: { ...process.env, API_BASE_URL: "", NEXT_PUBLIC_API_BASE_URL: "" },
    },
  );

  await waitForHttp(`${baseURL}/login`, 120_000);
  console.log(`==> dev server ready ${baseURL}`);
  return child;
}

function resolvePlaywright() {
  const playwrightPath = path.join(e2eDir, "node_modules", "playwright", "index.mjs");
  return import(pathToFileURL(playwrightPath).href);
}

const authUser = encodeURIComponent(
  JSON.stringify({
    id: "user_e2e",
    email: "e2e@example.com",
    name: "E2E User",
    activeWorkspaceId: "ws_dev",
  }),
);

async function installAuthCookies(context) {
  const hostname = new URL(baseURL).hostname;
  await context.addCookies([
    { name: "qiyun_auth_user", value: authUser, domain: hostname, path: "/", httpOnly: true, sameSite: "Lax" },
    { name: "qiyun_access_token", value: "e2e-access-token", domain: hostname, path: "/", httpOnly: true, sameSite: "Lax" },
    { name: "qiyun_refresh_token", value: "e2e-refresh-token", domain: hostname, path: "/", httpOnly: true, sameSite: "Lax" },
  ]);
}

function jsonRoute(page, pattern, body, status = 200) {
  return page.route(pattern, async (route) => {
    await route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  });
}

async function runTests(page, context, chromium) {
  const results = [];
  const activeBrowsers = new Set();

  function useReliableNavigation(targetPage) {
    const originalGoto = targetPage.goto.bind(targetPage);
    targetPage.goto = async (url, options = {}) => {
      const response = await originalGoto(url, { waitUntil: "domcontentloaded", ...options });
      // SSR fields can be visible before React has attached event handlers.
      // A short hydration settle prevents input values being replaced on first interaction.
      await targetPage.waitForTimeout(500);
      return response;
    };
    return targetPage;
  }

  useReliableNavigation(page);

  const originalLaunch = chromium.launch.bind(chromium);
  chromium = {
    launch: async (options) => {
      const browser = await originalLaunch(options);
      activeBrowsers.add(browser);

      const originalClose = browser.close.bind(browser);
      browser.close = async () => {
        activeBrowsers.delete(browser);
        await originalClose();
      };

      const originalNewContext = browser.newContext.bind(browser);
      browser.newContext = async (...args) => {
        const browserContext = await originalNewContext(...args);
        browserContext.on("page", useReliableNavigation);
        return browserContext;
      };
      return browser;
    },
  };

  async function test(name, fn) {
    process.stdout.write(`  • ${name} ... `);
    try {
      await fn();
      results.push({ name, ok: true });
      console.log("ok");
    } catch (error) {
      results.push({ name, ok: false, error });
      console.log("FAIL");
      console.error(`    ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      await Promise.allSettled([...activeBrowsers].map((browser) => browser.close()));
    }
  }

  const upstreamMode = {
    mode: "upstream",
    upstreamConfigured: true,
    message: "Connected to upstream API (apps/api) via BFF proxy.",
  };

  await test("未登录访问 Dashboard 跳转登录", async () => {
    await page.goto(`${baseURL}/dashboard`);
    await page.waitForURL(/\/login/, { timeout: 15_000 });
  });

  const previewMode = {
    mode: "preview",
    upstreamConfigured: false,
    message: "Preview mode with seeded demo data.",
  };

  await test("Preview 模式 Dashboard 展示 KPI", async () => {
    const authed = await chromium.launch({ headless: true });
    const authedContext = await authed.newContext({ baseURL });
    await installAuthCookies(authedContext);
    const authedPage = await authedContext.newPage();
    await jsonRoute(authedPage, "**/api/console/mode", previewMode);
    await authedPage.goto("/dashboard");
    await authedPage.getByText("总会话数").first().waitFor({ timeout: 30_000 });
    await authed.close();
  });

  await test("Dashboard 主数据失败展示错误与重试", async () => {
    const authed = await chromium.launch({ headless: true });
    const authedContext = await authed.newContext({ baseURL });
    await installAuthCookies(authedContext);
    const authedPage = await authedContext.newPage();
    await jsonRoute(authedPage, "**/api/console/mode", upstreamMode);
    await jsonRoute(authedPage, "**/api/dashboard", { code: "INTERNAL_ERROR", message: "Dashboard unavailable." }, 500);
    await authedPage.goto("/dashboard");
    await authedPage.getByText("网络请求失败").waitFor({ timeout: 20_000 });
    await authedPage.getByText("Dashboard unavailable.").waitFor();
    await authedPage.getByRole("button", { name: "重新加载" }).waitFor();
    await authed.close();
  });

  await test("Bot 404 展示 not found 且无重试", async () => {
    const missingId = "00000000-0000-0000-0000-000000000000";
    const authed = await chromium.launch({ headless: true });
    const authedContext = await authed.newContext({ baseURL });
    await installAuthCookies(authedContext);
    const authedPage = await authedContext.newPage();
    await jsonRoute(authedPage, "**/api/console/mode", upstreamMode);
    await jsonRoute(authedPage, `**/api/bots/${missingId}`, { code: "NOT_FOUND", message: "Bot not found." }, 404);
    await jsonRoute(authedPage, "**/api/bots", []);
    await authedPage.goto(`/dashboard/bots/${missingId}/basics`);
    await authedPage.getByText("未找到该机器人，可能已被删除或链接无效。").waitFor({ timeout: 20_000 });
    if (await authedPage.getByRole("button", { name: "重新加载" }).count()) {
      throw new Error("404 page should not show retry button");
    }
    await authed.close();
  });

  await test("Bot 加载失败展示可重试错误", async () => {
    const botId = "bot_e2e_error";
    const authed = await chromium.launch({ headless: true });
    const authedContext = await authed.newContext({ baseURL });
    await installAuthCookies(authedContext);
    const authedPage = await authedContext.newPage();
    await jsonRoute(authedPage, "**/api/console/mode", upstreamMode);
    await jsonRoute(authedPage, `**/api/bots/${botId}`, { code: "INTERNAL_ERROR", message: "Upstream exploded." }, 500);
    await authedPage.goto(`/dashboard/bots/${botId}/basics`);
    await authedPage.getByText("网络请求失败").waitFor({ timeout: 20_000 });
    await authedPage.getByRole("button", { name: "重新加载" }).waitFor();
    await authed.close();
  });

  await test("新版 AI 助手页展示助手概览", async () => {
    const authed = await chromium.launch({ headless: true });
    const authedContext = await authed.newContext({ baseURL });
    await installAuthCookies(authedContext);
    const authedPage = await authedContext.newPage();
    await jsonRoute(authedPage, "**/api/console/mode", upstreamMode);
    await authedPage.goto("/dashboard/bots");
    await authedPage.getByRole("heading", { name: "AI 助手" }).waitFor({ timeout: 20_000 });
    await authedPage.getByText("助手总数").first().waitFor();
    await authedPage.getByText("官网智能客服").waitFor();
    await authed.close();
  });

  await test("登录页协议勾选位于登录按钮之前", async () => {
    await page.goto("/login");
    await page.getByRole("heading", { name: "欢迎登录" }).waitFor({ timeout: 15_000 });
    await assertAgreementBeforeSubmit(page);
  });

  await test("登录未勾选协议时展示校验错误", async () => {
    const guest = await chromium.launch({ headless: true });
    const guestContext = await guest.newContext({ baseURL });
    const guestPage = await guestContext.newPage();
    await guestPage.goto("/login");
    await guestPage.getByPlaceholder("请输入工作邮箱").fill("demo@example.com");
    await guestPage.getByPlaceholder("请输入登录密码").fill("secret123");
    await guestPage.getByRole("button", { name: "登录", exact: true }).click();
    await guestPage.getByText("请先同意用户协议与隐私政策。").waitFor({ timeout: 10_000 });
    await guest.close();
  });

  await test("登录失败展示上游错误信息", async () => {
    const guest = await chromium.launch({ headless: true });
    const guestContext = await guest.newContext({ baseURL });
    const guestPage = await guestContext.newPage();
    await mockAuthLoginFailure(guestPage, "邮箱或密码错误。");
    await guestPage.goto("/login");
    await guestPage.getByPlaceholder("请输入工作邮箱").fill("demo@example.com");
    await guestPage.getByPlaceholder("请输入登录密码").fill("wrong-password");
    await guestPage.locator('label:has-text("用户协议") input[type="checkbox"]').check();
    await guestPage.getByRole("button", { name: "登录", exact: true }).click();
    await guestPage.getByText("邮箱或密码错误。").waitFor({ timeout: 10_000 });
    await guest.close();
  });

  await test("登录成功展示成功提示", async () => {
    const guest = await chromium.launch({ headless: true });
    const guestContext = await guest.newContext({ baseURL });
    const guestPage = await guestContext.newPage();
    await mockAuthLoginSuccess(guestPage);
    await guestPage.goto("/login");
    await guestPage.getByPlaceholder("请输入工作邮箱").fill("demo@example.com");
    await guestPage.getByPlaceholder("请输入登录密码").fill("secret123");
    await guestPage.locator('label:has-text("用户协议") input[type="checkbox"]').check();
    await guestPage.getByRole("button", { name: "登录", exact: true }).click();
    await guestPage.getByText("登录成功，正在进入控制台。").waitFor({ timeout: 10_000 });
    await guestPage.waitForURL(/\/dashboard\//, { timeout: 15_000 });
    await guest.close();
  });

  await test("忘记密码跳转到重置页", async () => {
    const guest = await chromium.launch({ headless: true });
    const guestContext = await guest.newContext({ baseURL });
    const guestPage = await guestContext.newPage();
    await guestPage.goto("/login");
    await guestPage.getByRole("button", { name: /忘记密码/ }).click();
    await guestPage.waitForURL(/\/forgot-password/, { timeout: 10_000 });
    await guestPage.getByRole("heading", { name: "找回密码" }).waitFor();
    await guest.close();
  });

  await test("登录页可进入申请试用与验证码登录", async () => {
    const guest = await chromium.launch({ headless: true });
    const guestContext = await guest.newContext({ baseURL });
    const guestPage = await guestContext.newPage();
    await guestPage.goto("/login");
    await guestPage.getByLabel("登录区域").getByRole("link", { name: "申请试用" }).click();
    await guestPage.waitForURL(/\/trial/, { timeout: 10_000 });
    await guestPage.getByRole("heading", { name: "申请试用 AI云" }).waitFor();
    await guestPage.goto("/login");
    await guestPage.getByRole("link", { name: "验证码登录" }).click();
    await guestPage.waitForURL(/\/login\/code/, { timeout: 10_000 });
    await guest.close();
  });

  await test("试用申请表单校验必填项", async () => {
    const guest = await chromium.launch({ headless: true });
    const guestContext = await guest.newContext({ baseURL });
    const guestPage = await guestContext.newPage();
    await guestPage.goto("/trial");
    await guestPage.getByRole("button", { name: "提交试用申请" }).click();
    await guestPage.getByText("请完善必填项后再提交。").waitFor({ timeout: 10_000 });
    await guestPage.getByText("请填写企业名称。").waitFor();
    await guest.close();
  });

  await test("试用申请提交成功展示提示", async () => {
    const guest = await chromium.launch({ headless: true });
    const guestContext = await guest.newContext({ baseURL });
    const guestPage = await guestContext.newPage();
    await mockTrialRequestSuccess(guestPage);
    await guestPage.goto("/trial");
    await guestPage.getByPlaceholder("请输入企业名称").fill("华东制造");
    await guestPage.getByPlaceholder("联系人姓名").fill("张工");
    await guestPage.getByPlaceholder("工作邮箱（用于接收邀请）").fill("trial@example.com");
    await guestPage.getByRole("button", { name: "提交试用申请" }).click();
    await guestPage.getByRole("heading", { name: "试用申请已收到" }).waitFor({ timeout: 10_000 });
    await guest.close();
  });

  await test("重置密码发送验证码并确认成功", async () => {
    const guest = await chromium.launch({ headless: true });
    const guestContext = await guest.newContext({ baseURL });
    const guestPage = await guestContext.newPage();
    await mockPasswordResetRequest(guestPage, "654321");
    await mockPasswordResetConfirm(guestPage);
    await guestPage.goto("/forgot-password");
    await guestPage.getByPlaceholder("请输入工作邮箱").fill("demo@example.com");
    await guestPage.getByRole("button", { name: "发送验证码" }).click();
    await guestPage.getByText("当前环境未接入真实邮件，请使用下方验证码。").waitFor({ timeout: 10_000 });
    await guestPage.getByText("654321").waitFor();
    const codeInputs = guestPage.getByRole("group", { name: "6 位验证码输入" }).getByRole("textbox");
    for (const [index, digit] of [..."654321"].entries()) {
      await codeInputs.nth(index).fill(digit);
    }
    await guestPage.getByPlaceholder("请输入新密码（至少 6 位）").fill("newsecret123");
    await guestPage.getByPlaceholder("请再次输入新密码").fill("newsecret123");
    await guestPage.getByRole("button", { name: "重置密码", exact: true }).click();
    await guestPage.getByRole("heading", { name: "密码重置成功" }).waitFor({ timeout: 10_000 });
    await guestPage.getByRole("button", { name: "返回登录" }).click();
    await guestPage.waitForURL(/\/login/, { timeout: 15_000 });
    await guest.close();
  });

  await test("线索详情展示摘要与来源站点", async () => {
    const leadId = "lead_e2e_detail";
    const leadListItem = {
      id: leadId,
      name: "华东张工",
      contact: "13800138000",
      sourceBotId: "bot_support",
      sourceBot: "官网客服",
      lastQuestion: "这套设备报价是多少？",
      summary: "关键问题：这套设备报价是多少？；AI 回复摘要：请补充联系方式。",
      sourceSiteName: "官网预览站",
      status: "new",
      assignee: null,
      createdAt: "2026-07-03T10:00:00.000Z",
      updatedAt: "2026-07-03T10:00:00.000Z",
    };
    const leadDetail = {
      ...leadListItem,
      conversationId: "conv_e2e",
      phone: "13800138000",
      company: "华东制造",
      requirement: "需要工业冷水机报价",
      notes: "",
    };

    const authed = await chromium.launch({ headless: true });
    const authedContext = await authed.newContext({ baseURL });
    await installAuthCookies(authedContext);
    const authedPage = await authedContext.newPage();
    await jsonRoute(authedPage, "**/api/console/mode", upstreamMode);
    await jsonRoute(authedPage, "**/api/leads", [leadListItem]);
    await jsonRoute(authedPage, `**/api/leads/${leadId}`, leadDetail);
    await jsonRoute(authedPage, "**/api/bots", [{ id: "bot_support", name: "官网客服" }]);

    await authedPage.goto("/dashboard/leads");
    await authedPage.getByRole("cell", { name: "华东张工" }).click();
    await authedPage.getByRole("heading", { name: "华东张工" }).waitFor({ timeout: 15_000 });
    await authedPage.getByText("需要工业冷水机报价").waitFor();
    await authedPage.getByText("来源站点").waitFor();
    await authedPage.getByText("官网预览站").waitFor();
    await authedPage.getByText("AI 会话摘要").waitFor();
    await authedPage
      .locator("section")
      .filter({ hasText: "AI 会话摘要" })
      .getByText(/AI 回复摘要/)
      .waitFor();
    await authed.close();
  });

  return results;
}

const dev = await startDevServer();

try {
  if (!existsSync(path.join(e2eDir, "node_modules", "playwright", "index.mjs"))) {
    throw new Error("Missing playwright in apps/console/e2e/node_modules. Run: cd apps/console/e2e && npm install");
  }

  const { chromium } = await resolvePlaywright();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ baseURL });
  const page = await context.newPage();

  console.log("==> Console browser E2E");
  const results = await runTests(page, context, chromium);
  await browser.close();

  const failed = results.filter((item) => !item.ok);
  console.log(`\n==> ${results.length - failed.length}/${results.length} passed`);
  if (failed.length) {
    process.exit(1);
  }
  console.log("==> Console browser E2E passed");
} finally {
  if (dev && !dev.killed) dev.kill("SIGTERM");
}
