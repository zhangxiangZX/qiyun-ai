#!/usr/bin/env node
/**
 * Playwright UI 级流程化测试 · 多客户场景 · 端到端点击验证
 *
 * 先通过 API 登录获取 cookie，再用 cookie 注入方式访问 console 页面，
 * 对每个功能点进行页面加载 + 关键元素 + 交互按钮的端到端验证。
 *
 * 前置：API http://localhost:3001 已启动，console http://localhost:3000 已启动。
 * 用法：node apps/console/e2e/run-ui-flow-test.mjs
 *   环境变量：
 *     RUNS               — 跑几轮（默认 2）
 *     API_BASE_URL       — API 地址（默认 http://localhost:3001）
 *     CONSOLE_BASE_URL   — Console 地址（默认 http://localhost:3000）
 *     E2E_EMAIL          — 登录邮箱（默认 owner@qiyun.ai）
 *     E2E_PASSWORD       — 登录密码（默认 Qiyun@2026）
 */
import { existsSync, writeFileSync } from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const e2eDir = path.dirname(fileURLToPath(import.meta.url));
const apiBase = (process.env.API_BASE_URL || "http://localhost:3001").replace(/\/$/, "");
const consoleBase = (process.env.CONSOLE_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const email = process.env.E2E_EMAIL || "owner@qiyun.ai";
const password = process.env.E2E_PASSWORD || "Qiyun@2026";
const RUNS = Number(process.env.RUNS || 2);

// ---------- 工具函数 ----------

function waitForHttp(url, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const attempt = () => {
      http
        .get(url, (res) => {
          res.resume();
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 500) resolve(undefined);
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

/** 通过 API 登录，返回 cookie 注入所需的数据 */
async function loginViaApi() {
  const res = await fetch(`${apiBase}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`API login failed: HTTP ${res.status}`);
  const j = await res.json();
  const payload = j.data ?? j;
  const accessToken = payload.tokens?.accessToken ?? payload.accessToken;
  const refreshToken = payload.tokens?.refreshToken ?? payload.refreshToken;
  const user = payload.user;
  if (!accessToken || !user) throw new Error("Login response missing token or user");
  return { accessToken, refreshToken, user };
}

/** 将 auth cookie 注入 Playwright 浏览器上下文 */
async function injectAuthCookies(context, auth) {
  const hostname = new URL(consoleBase).hostname;
  const userCookieValue = encodeURIComponent(JSON.stringify(auth.user));
  await context.addCookies([
    {
      name: "qiyun_access_token",
      value: auth.accessToken,
      domain: hostname,
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
    {
      name: "qiyun_refresh_token",
      value: auth.refreshToken,
      domain: hostname,
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
    {
      name: "qiyun_auth_user",
      value: userCookieValue,
      domain: hostname,
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}

/** 等待页面进入正式 API 模式（非演示模式） */
async function waitForUpstreamMode(page, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const upstream = await page.getByText("正式 API 模式").count();
    if (upstream > 0) return;
    const preview = await page.getByText("演示模式").count();
    if (preview > 0) throw new Error("页面进入演示模式，API 可能未连接");
    await page.waitForTimeout(500);
  }
  // 超时不报错，继续执行后续检查（部分页面可能无 banner）
}

/** 等待页面加载完成 */
async function waitForPageReady(page) {
  await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => undefined);
  await page.waitForTimeout(800);
}

// ---------- 测试结果记录 ----------

const allResults = [];
const allBugs = [];

function record(runIdx, pageId, pageName, step, ok, detail) {
  const entry = { run: runIdx + 1, pageId, pageName, step, ok, detail };
  allResults.push(entry);
  const tag = ok ? "PASS" : "FAIL";
  const icon = ok ? "  ✓" : "  ✗";
  console.log(`${icon} [R${runIdx + 1}] ${pageId} ${pageName} / ${step}${detail && !ok ? ` — ${detail.slice(0, 120)}` : ""}`);
  if (!ok) {
    allBugs.push(entry);
  }
}

// ---------- 页面测试定义 ----------

/**
 * 每个页面测试函数：
 * 1. 导航到页面 URL
 * 2. 等待页面加载
 * 3. 验证关键元素存在（toBeVisible）
 * 4. 如果有"新建"按钮，点击验证弹窗打开
 * 5. 关闭弹窗
 */
const PAGE_TESTS = [
  {
    id: "DASH",
    name: "Dashboard 首页",
    url: "/dashboard/boss",
    async test(page, runIdx) {
      try {
        await page.locator("section[aria-label='经营指标'], article.card.kpi, .kpiGrid").first().waitFor({ state: "visible", timeout: 20_000 });
        record(runIdx, "DASH", "Dashboard 首页", "KPI 卡片显示", true);
      } catch (e) {
        record(runIdx, "DASH", "Dashboard 首页", "KPI 卡片显示", false, String(e));
      }

      try {
        const quickAction = page.getByRole("link", { name: /查看全部|查看渠道分析/ }).first();
        await quickAction.waitFor({ state: "visible", timeout: 15_000 });
        record(runIdx, "DASH", "Dashboard 首页", "快捷操作按钮存在", true);
      } catch (e) {
        record(runIdx, "DASH", "Dashboard 首页", "快捷操作按钮存在", false, String(e));
      }
    },
  },
  {
    id: "INQ",
    name: "Inquiries 询盘",
    url: "/dashboard/inquiries",
    async test(page, runIdx) {
      // 验证列表加载
      try {
        await page.waitForTimeout(1500);
        const hasContent = (await page.locator("table, [class*=list], [class*=card]").count()) > 0;
        record(runIdx, "INQ", "Inquiries 询盘", "列表加载", hasContent);
      } catch (e) {
        record(runIdx, "INQ", "Inquiries 询盘", "列表加载", false, String(e));
      }

      // 导出（须在离开列表页前检查）
      try {
        const exportBtn = page.getByRole("button", { name: /导出/ }).first();
        await exportBtn.waitFor({ state: "visible", timeout: 10_000 });
        record(runIdx, "INQ", "Inquiries 询盘", "导出按钮可见", true);
      } catch (e) {
        record(runIdx, "INQ", "Inquiries 询盘", "导出按钮可见", false, String(e));
      }

      // 新建询盘入口（跳转到独立页，非弹窗）
      try {
        const newBtn = page.getByRole("link", { name: /新建询盘/ }).first();
        const newBtnAlt = page.getByText("新建询盘").first();
        const target = (await newBtn.count()) > 0 ? newBtn : newBtnAlt;
        await target.waitFor({ state: "visible", timeout: 10_000 });
        await target.click();
        await page.waitForURL(/\/dashboard\/inquiries\/new|\/dashboard\/inquiries/, { timeout: 10_000 }).catch(() => undefined);
        const onNewPage =
          page.url().includes("/inquiries/new") ||
          (await page.getByText(/新建询盘|客户信息|联系方式/).count()) > 0;
        record(runIdx, "INQ", "Inquiries 询盘", "新建询盘入口可用", onNewPage);
        if (page.url().includes("/inquiries/new")) {
          await page.goto("/dashboard/inquiries", { waitUntil: "domcontentloaded" });
          await page.waitForTimeout(800);
        } else {
          await page.keyboard.press("Escape").catch(() => undefined);
          await page.waitForTimeout(300);
        }
      } catch (e) {
        record(runIdx, "INQ", "Inquiries 询盘", "新建询盘入口可用", false, String(e));
      }
    },
  },
  {
    id: "QUO",
    name: "Quotes 报价",
    url: "/dashboard/quotes",
    async test(page, runIdx) {
      // 验证列表加载
      try {
        await page.waitForTimeout(1500);
        const hasContent = (await page.locator("table, [class*=list], [class*=card]").count()) > 0;
        record(runIdx, "QUO", "Quotes 报价", "列表加载", hasContent);
      } catch (e) {
        record(runIdx, "QUO", "Quotes 报价", "列表加载", false, String(e));
      }

      // 新建报价弹窗
      try {
        const newBtn = page.getByText("新建报价").first();
        await newBtn.waitFor({ state: "visible", timeout: 10_000 });
        await newBtn.click();
        await page.waitForTimeout(800);
        const dialog = page.getByText("新建报价").last();
        await dialog.waitFor({ state: "visible", timeout: 5_000 });
        record(runIdx, "QUO", "Quotes 报价", "新建报价弹窗打开", true);

        await page.keyboard.press("Escape");
        await page.waitForTimeout(500);
      } catch (e) {
        record(runIdx, "QUO", "Quotes 报价", "新建报价弹窗打开", false, String(e));
      }
    },
  },
  {
    id: "CUS",
    name: "Customers 客户",
    url: "/dashboard/customers",
    async test(page, runIdx) {
      // 验证列表加载
      try {
        await page.waitForTimeout(1500);
        const hasContent = (await page.locator("table, [class*=list], [class*=card]").count()) > 0;
        record(runIdx, "CUS", "Customers 客户", "列表加载", hasContent);
      } catch (e) {
        record(runIdx, "CUS", "Customers 客户", "列表加载", false, String(e));
      }

      // 新建客户弹窗
      try {
        const newBtn = page.getByText("新建客户").first();
        await newBtn.waitFor({ state: "visible", timeout: 10_000 });
        await newBtn.click();
        await page.waitForTimeout(800);
        const dialog = page.getByText("新建客户").last();
        await dialog.waitFor({ state: "visible", timeout: 5_000 });
        record(runIdx, "CUS", "Customers 客户", "新建客户弹窗打开", true);

        await page.keyboard.press("Escape");
        await page.waitForTimeout(500);
      } catch (e) {
        record(runIdx, "CUS", "Customers 客户", "新建客户弹窗打开", false, String(e));
      }
    },
  },
  {
    id: "LEAD",
    name: "Leads 线索",
    url: "/dashboard/leads",
    async test(page, runIdx) {
      // 验证列表加载
      try {
        await page.waitForTimeout(1500);
        const hasContent = (await page.locator("table, [class*=list], [class*=card]").count()) > 0;
        record(runIdx, "LEAD", "Leads 线索", "列表加载", hasContent);
      } catch (e) {
        record(runIdx, "LEAD", "Leads 线索", "列表加载", false, String(e));
      }

      // 验证搜索框可用
      try {
        const searchInput = page.locator("#lead-search-filter");
        await searchInput.waitFor({ state: "visible", timeout: 10_000 });
        await searchInput.fill("测试搜索");
        await page.waitForTimeout(500);
        const value = await searchInput.inputValue();
        record(runIdx, "LEAD", "Leads 线索", "搜索框可用", value === "测试搜索");
        await searchInput.fill("");
      } catch (e) {
        record(runIdx, "LEAD", "Leads 线索", "搜索框可用", false, String(e));
      }

      // 新建线索弹窗
      try {
        const newBtn = page.getByText("新建线索").first();
        await newBtn.waitFor({ state: "visible", timeout: 10_000 });
        await newBtn.click();
        await page.waitForTimeout(800);
        const dialog = page.getByText("新建线索").last();
        await dialog.waitFor({ state: "visible", timeout: 5_000 });
        record(runIdx, "LEAD", "Leads 线索", "新建线索弹窗打开", true);

        await page.keyboard.press("Escape");
        await page.waitForTimeout(500);
      } catch (e) {
        record(runIdx, "LEAD", "Leads 线索", "新建线索弹窗打开", false, String(e));
      }
    },
  },
  {
    id: "BR",
    name: "Business Rules 业务规则",
    url: "/dashboard/settings/business-rules",
    async test(page, runIdx) {
      // 验证规则列表加载
      try {
        await page.waitForTimeout(1500);
        const hasRule = (await page.getByText(/启用|停用|关键词|高意图/).count()) > 0;
        record(runIdx, "BR", "Business Rules 业务规则", "规则列表加载", hasRule);
      } catch (e) {
        record(runIdx, "BR", "Business Rules 业务规则", "规则列表加载", false, String(e));
      }

      // 验证启用/停用开关存在
      try {
        // 表格状态列中的"启用"徽章（badge）— 不是 <option> 中的文本
        const badge = page.locator("span:has-text('启用'), span:has-text('停用')").first();
        await badge.waitFor({ state: "visible", timeout: 10_000 });
        record(runIdx, "BR", "Business Rules 业务规则", "启用/停用开关存在", true);
      } catch (e) {
        // 备选：侧边栏中的 checkbox 开关
        try {
          const switchInput = page.locator("aside input[type=checkbox]").first();
          await switchInput.waitFor({ state: "attached", timeout: 5_000 });
          record(runIdx, "BR", "Business Rules 业务规则", "启用/停用开关存在", true);
        } catch (e2) {
          record(runIdx, "BR", "Business Rules 业务规则", "启用/停用开关存在", false, String(e2));
        }
      }
    },
  },
  {
    id: "SITE",
    name: "Sites 站点",
    url: "/dashboard/sites",
    async test(page, runIdx) {
      // 验证列表加载
      try {
        await page.waitForTimeout(1500);
        const hasContent = (await page.locator("[class*=card], [class*=list], table, [class*=site]").count()) > 0;
        record(runIdx, "SITE", "Sites 站点", "列表加载", hasContent);
      } catch (e) {
        record(runIdx, "SITE", "Sites 站点", "列表加载", false, String(e));
      }

      // 新建站点弹窗（接入新站点）
      try {
        const newBtn = page.getByText("接入新站点").first();
        await newBtn.waitFor({ state: "visible", timeout: 10_000 });
        await newBtn.click();
        await page.waitForTimeout(800);
        const dialog = page.getByText("接入新站点").last();
        await dialog.waitFor({ state: "visible", timeout: 5_000 });
        record(runIdx, "SITE", "Sites 站点", "新建站点弹窗打开", true);

        await page.keyboard.press("Escape");
        await page.waitForTimeout(500);
      } catch (e) {
        record(runIdx, "SITE", "Sites 站点", "新建站点弹窗打开", false, String(e));
      }
    },
  },
  {
    id: "KB",
    name: "Knowledge Bases 知识库",
    url: "/dashboard/knowledge-bases",
    async test(page, runIdx) {
      // 验证列表加载
      try {
        await page.waitForTimeout(1500);
        const hasContent = (await page.getByText(/知识库|创建|新建|上传/).count()) > 0;
        record(runIdx, "KB", "Knowledge Bases 知识库", "列表加载", hasContent);
      } catch (e) {
        record(runIdx, "KB", "Knowledge Bases 知识库", "列表加载", false, String(e));
      }
    },
  },
  {
    id: "BOT",
    name: "Bots 机器人",
    url: "/dashboard/bots",
    async test(page, runIdx) {
      // 验证列表加载
      try {
        await page.waitForTimeout(1500);
        const hasContent = (await page.locator("[class*=card], [class*=list], table, a[href*=bots]").count()) > 0;
        record(runIdx, "BOT", "Bots 机器人", "列表加载", hasContent);
      } catch (e) {
        record(runIdx, "BOT", "Bots 机器人", "列表加载", false, String(e));
      }

      // 新建助手入口（V1 为跳转配置页，非弹窗）
      try {
        const newBtn = page.getByRole("link", { name: "新建助手" }).first();
        await newBtn.waitFor({ state: "visible", timeout: 10_000 });
        record(runIdx, "BOT", "Bots 机器人", "新建助手入口", true);
      } catch (e) {
        record(runIdx, "BOT", "Bots 机器人", "新建助手入口", false, String(e));
      }
    },
  },
  {
    id: "CONV",
    name: "Conversations 会话",
    url: "/dashboard/conversations",
    async test(page, runIdx) {
      // 验证列表加载
      try {
        await page.waitForTimeout(2000);
        const hasContent = (await page.locator("[class*=list], [class*=card], [role=listitem], button").count()) > 0;
        record(runIdx, "CONV", "Conversations 会话", "列表加载", hasContent);
      } catch (e) {
        record(runIdx, "CONV", "Conversations 会话", "列表加载", false, String(e));
      }
    },
  },
  {
    id: "RPT",
    name: "Reports 报表",
    url: "/dashboard/reports",
    async test(page, runIdx) {
      // 验证页面加载
      try {
        await page.waitForTimeout(1500);
        const hasContent = (await page.getByText(/渠道|转化|报表|对比/).count()) > 0;
        record(runIdx, "RPT", "Reports 报表", "页面加载", hasContent);
      } catch (e) {
        record(runIdx, "RPT", "Reports 报表", "页面加载", false, String(e));
      }
    },
  },
  {
    id: "TEAM",
    name: "Team 团队",
    url: "/dashboard/team",
    async test(page, runIdx) {
      // 验证成员列表加载
      try {
        await page.waitForTimeout(1500);
        const hasContent = (await page.getByText(/团队成员|成员|owner@qiyun|邀请/).count()) > 0;
        record(runIdx, "TEAM", "Team 团队", "成员列表加载", hasContent);
      } catch (e) {
        record(runIdx, "TEAM", "Team 团队", "成员列表加载", false, String(e));
      }
    },
  },
  {
    id: "TASK",
    name: "Follow Tasks 跟进任务",
    url: "/dashboard/tasks",
    async test(page, runIdx) {
      try {
        await page.waitForTimeout(1500);
        const hasContent = (await page.getByText(/跟进任务|新建任务|标记完成/).count()) > 0;
        record(runIdx, "TASK", "Follow Tasks 跟进任务", "页面关键元素", hasContent);
      } catch (e) {
        record(runIdx, "TASK", "Follow Tasks 跟进任务", "页面关键元素", false, String(e));
      }
    },
  },
  {
    id: "SEL",
    name: "Selection Pages AI选型页",
    url: "/dashboard/bots/landing",
    async test(page, runIdx) {
      try {
        await page.waitForTimeout(1500);
        const hasContent = (await page.getByText(/AI 选型|新建选型页|选型页/).count()) > 0;
        record(runIdx, "SEL", "Selection Pages AI选型页", "列表与入口", hasContent);
      } catch (e) {
        record(runIdx, "SEL", "Selection Pages AI选型页", "列表与入口", false, String(e));
      }
    },
  },
  {
    id: "QR",
    name: "QRCodes 二维码管理",
    url: "/dashboard/channels/qrcodes",
    async test(page, runIdx) {
      try {
        await page.waitForTimeout(1500);
        const hasContent = (await page.getByText(/二维码|销售链接|访问量/).count()) > 0;
        record(runIdx, "QR", "QRCodes 二维码管理", "概览与列表", hasContent);
      } catch (e) {
        record(runIdx, "QR", "QRCodes 二维码管理", "概览与列表", false, String(e));
      }
    },
  },
  {
    id: "NEWQ",
    name: "New Quotation 新建报价",
    url: "/dashboard/quotes/new",
    async test(page, runIdx) {
      try {
        await page.waitForTimeout(1500);
        const hasContent = (await page.getByText(/新建报价|生成报价|客户信息/).count()) > 0;
        record(runIdx, "NEWQ", "New Quotation 新建报价", "表单加载", hasContent);
      } catch (e) {
        record(runIdx, "NEWQ", "New Quotation 新建报价", "表单加载", false, String(e));
      }
      try {
        const btn = page.getByRole("button", { name: /生成报价/ }).first();
        await btn.waitFor({ state: "visible", timeout: 10_000 });
        record(runIdx, "NEWQ", "New Quotation 新建报价", "生成报价按钮", true);
      } catch (e) {
        record(runIdx, "NEWQ", "New Quotation 新建报价", "生成报价按钮", false, String(e));
      }
    },
  },
  {
    id: "LOST",
    name: "Lost Reasons 丢单分析",
    url: "/dashboard/reports/lost-reasons",
    async test(page, runIdx) {
      try {
        await page.waitForTimeout(1500);
        const hasContent = (await page.getByText(/丢单原因|丢单总数|代表性丢单/).count()) > 0;
        record(runIdx, "LOST", "Lost Reasons 丢单分析", "报表加载", hasContent);
      } catch (e) {
        record(runIdx, "LOST", "Lost Reasons 丢单分析", "报表加载", false, String(e));
      }
    },
  },
  {
    id: "INV",
    name: "Invite Member 邀请成员",
    url: "/dashboard/team/invite",
    async test(page, runIdx) {
      try {
        await page.waitForTimeout(1500);
        const hasContent = (await page.getByText(/邀请成员|邮箱邀请|发送邀请/).count()) > 0;
        record(runIdx, "INV", "Invite Member 邀请成员", "邀请表单", hasContent);
      } catch (e) {
        record(runIdx, "INV", "Invite Member 邀请成员", "邀请表单", false, String(e));
      }
    },
  },
  {
    id: "EPROF",
    name: "Enterprise Profile 企业资料",
    url: "/dashboard/team/profile",
    async test(page, runIdx) {
      try {
        await page.waitForTimeout(1500);
        const hasContent = (await page.getByText(/企业资料|编辑资料|公司名称/).count()) > 0;
        record(runIdx, "EPROF", "Enterprise Profile 企业资料", "资料页加载", hasContent);
      } catch (e) {
        record(runIdx, "EPROF", "Enterprise Profile 企业资料", "资料页加载", false, String(e));
      }
    },
  },
];

// ---------- Playwright 加载 ----------

function resolvePlaywright() {
  const playwrightPath = path.join(e2eDir, "node_modules", "playwright", "index.mjs");
  if (!existsSync(playwrightPath)) throw new Error("Missing playwright — 请在 e2e/ 目录下安装");
  return import(pathToFileURL(playwrightPath).href);
}

// ---------- 主流程 ----------

console.log("==> Playwright UI 级流程化测试");
console.log(`    Console: ${consoleBase}`);
console.log(`    API:     ${apiBase}`);
console.log(`    Account: ${email}`);
console.log(`    Runs:    ${RUNS}`);
console.log("");

// 等待服务可用
console.log("==> 等待服务可用...");
await waitForHttp(`${apiBase}/health`);
await waitForHttp(`${consoleBase}/login`);
console.log("    服务已就绪\n");

// API 登录
console.log("==> 通过 API 登录获取 cookie...");
const auth = await loginViaApi();
console.log(`    登录成功: ${auth.user.email} (workspace: ${auth.user.activeWorkspaceId ?? "N/A"})\n`);

// 加载 Playwright
const { chromium } = await resolvePlaywright();
const browser = await chromium.launch({ headless: true });

for (let run = 0; run < RUNS; run++) {
  console.log(`==> 第 ${run + 1}/${RUNS} 轮测试开始`);
  console.log("-".repeat(70));

  const context = await browser.newContext({ baseURL: consoleBase });
  await injectAuthCookies(context, auth);
  const page = await context.newPage();

  for (const ptest of PAGE_TESTS) {
    console.log(`\n  --> ${ptest.id} ${ptest.name} (${ptest.url})`);

    // 导航到页面
    try {
      await page.goto(ptest.url, { waitUntil: "domcontentloaded", timeout: 30_000 });
      await waitForUpstreamMode(page).catch(() => undefined);
      await waitForPageReady(page);
      record(run, ptest.id, ptest.name, "页面加载成功", true);
    } catch (e) {
      record(run, ptest.id, ptest.name, "页面加载成功", false, String(e));
      continue; // 页面都没加载出来，跳过后续测试
    }

    // 执行页面特定测试
    try {
      await ptest.test(page, run);
    } catch (e) {
      record(run, ptest.id, ptest.name, "测试执行", false, String(e));
    }
  }

  await context.close();
  console.log(`\n==> 第 ${run + 1}/${RUNS} 轮测试结束\n`);
}

await browser.close();

// ---------- 汇总报告 ----------

const totalTests = allResults.length;
const passedTests = allResults.filter((r) => r.ok).length;
const failedTests = allResults.length - passedTests;

// 按页面汇总
const pageSummary = {};
for (const r of allResults) {
  const key = r.pageId;
  if (!pageSummary[key]) {
    pageSummary[key] = { name: r.pageName, steps: {}, totalPass: 0, totalFail: 0 };
  }
  if (!pageSummary[key].steps[r.step]) {
    pageSummary[key].steps[r.step] = { pass: 0, fail: 0 };
  }
  if (r.ok) pageSummary[key].steps[r.step].pass++;
  else pageSummary[key].steps[r.step].fail++;
  if (r.ok) pageSummary[key].totalPass++;
  else pageSummary[key].totalFail++;
}

console.log("=".repeat(70));
console.log("==> 测试汇总报告");
console.log("=".repeat(70));
console.log(`总测试步骤: ${totalTests}`);
console.log(`通过: ${passedTests}`);
console.log(`失败: ${failedTests}`);
console.log(`通过率: ${totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : 0}%\n`);

console.log("按页面汇总:");
console.log("-".repeat(70));
for (const [pageId, summary] of Object.entries(pageSummary)) {
  const total = summary.totalPass + summary.totalFail;
  const rate = total > 0 ? ((summary.totalPass / total) * 100).toFixed(0) : 0;
  const status = summary.totalFail === 0 ? "ALL PASS" : summary.totalPass === 0 ? "ALL FAIL" : "PARTIAL";
  console.log(`  ${pageId.padEnd(6)} ${summary.name.padEnd(30)} ${String(summary.totalPass).padStart(3)}/${total}  ${rate.padStart(3)}%  ${status}`);
}
console.log("-".repeat(70));

if (allBugs.length > 0) {
  console.log(`\n==> 失败详情 (${allBugs.length} 项):`);
  for (const bug of allBugs) {
    console.log(`  [R${bug.run}] ${bug.pageId} / ${bug.step}: ${bug.detail?.slice(0, 120)}`);
  }
}

// 生成 JSON 报告
const report = {
  generatedAt: new Date().toISOString(),
  environment: {
    consoleBase,
    apiBase,
    email,
    runs: RUNS,
  },
  summary: {
    totalSteps: totalTests,
    passed: passedTests,
    failed: failedTests,
    passRate: totalTests > 0 ? Number(((passedTests / totalTests) * 100).toFixed(1)) : 0,
  },
  pageSummary: Object.entries(pageSummary).map(([pageId, s]) => ({
    pageId,
    pageName: s.name,
    totalPass: s.totalPass,
    totalFail: s.totalFail,
    steps: Object.entries(s.steps).map(([step, st]) => ({ step, pass: st.pass, fail: st.fail })),
  })),
  results: allResults,
  bugs: allBugs,
};

const reportPath = path.join(e2eDir, "..", "UI-FLOW-TEST-REPORT.json");
writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(`\n==> JSON 报告: ${reportPath}`);

if (failedTests > 0) {
  console.log(`==> 有 ${failedTests} 项失败，详见报告`);
  process.exit(1);
}
console.log("==> 全部通过");
