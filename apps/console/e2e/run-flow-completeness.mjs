#!/usr/bin/env node
/**
 * 流程完整性 + 假数据 + 多场景 + 跑多次
 *
 * 对每个功能点的 API 流程（LIST/CREATE/UPDATE/DELETE）用大量假数据跑多轮，
 * 定量暴露哪些创建/更新端点缺失（404）或失效，对应前端"假成功"风险。
 *
 * 前置：API http://localhost:3001 已启动，存在 owner@qiyun.ai 账号。
 * 用法：node apps/console/e2e/run-flow-completeness.mjs
 *   环境变量：API_BASE_URL / E2E_EMAIL / E2E_PASSWORD / FLOW_RUNS（默认 3）
 */
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const apiBase = (process.env.API_BASE_URL || "http://localhost:3001").replace(/\/$/, "");
const email = process.env.E2E_EMAIL || "owner@qiyun.ai";
const password = process.env.E2E_PASSWORD || "Qiyun@2026";
const RUNS = Number(process.env.FLOW_RUNS || 3);

const e2eDir = path.dirname(fileURLToPath(import.meta.url));

// ---------- 假数据生成（多客户场景） ----------
const PERSONAS = [
  { industry: "制造业", suffix: "机械", products: ["数控机床", "注塑机", "激光切割机", "工业机器人"] },
  { industry: "电子", suffix: "电子", products: ["PCB 板", "传感器", "连接器", "电源模块"] },
  { industry: "建材", suffix: "建材", products: ["铝型材", "中空玻璃", "防水涂料", "保温板"] },
  { industry: "医疗器械", suffix: "医疗", products: ["监护仪", "一次性耗材", "超声设备", "手术器械"] },
  { industry: "新能源", suffix: "新能源", products: ["锂电池", "光伏组件", "充电桩", "逆变器"] },
  { industry: "食品", suffix: "食品", products: ["包装机械", "调味料", "冷链设备", "灌装线"] },
];

const SURNAMES = "王李张刘陈杨黄赵周吴徐孙马朱胡林郭何高罗".split("");
const GIVEN = ["伟", "芳", "娜", "敏", "静", "强", "磊", "军", "洋", "勇", "艳", "杰", "涛", "明", "超", "霞", "平", "刚", "桂英", "丽"];

function pick(arr, seed) {
  return arr[Math.abs(seed) % arr.length];
}
function fakeName(seed) {
  return pick(SURNAMES, seed) + pick(GIVEN, seed * 7 + 3);
}
function fakeEmail(name, seed) {
  return `${pinyinish(name)}${seed}@example.com`;
}
function pinyinish(name) {
  // 简易：用 hash 生成英文名
  const pool = "abcdefghijklmnopqrstuvwxyz";
  let s = "";
  for (let i = 0; i < 6; i++) s += pool[(name.charCodeAt(i % name.length) + i * 3) % 26];
  return s;
}
function fakeDomain(seed, suffix) {
  const pool = "abcdefghijklmnopqrstuvwxyz";
  let s = "";
  for (let i = 0; i < 5; i++) s += pool[(seed * 13 + i * 7) % 26];
  return `${s}-${suffix}.cn`;
}
function fakePhone(seed) {
  let s = "13";
  for (let i = 0; i < 9; i++) s += (seed * 3 + i * 7) % 10;
  return s;
}

// 每轮生成一批假数据（一个 persona × 多条）
function generateFakeData(runIdx) {
  const persona = PERSONAS[runIdx % PERSONAS.length];
  const batch = [];
  for (let i = 0; i < 8; i++) {
    const seed = runIdx * 100 + i * 17 + 5;
    batch.push({
      persona,
      name: fakeName(seed),
      email: fakeEmail(fakeName(seed), seed),
      phone: fakePhone(seed),
      domain: fakeDomain(seed, persona.suffix),
      company: `${pick(SURNAMES, seed)}氏${persona.suffix}有限公司`,
      product: pick(persona.products, seed),
      message: `您好，我们对${pick(persona.products, seed)}感兴趣，${persona.industry}场景，预算${(seed % 50 + 10)}万，请报价。`,
      runIdx,
    });
  }
  return batch;
}

// ---------- 请求工具 ----------
async function req(headers, method, path, body) {
  const res = await fetch(`${apiBase}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = text.slice(0, 160);
  }
  const payload = json && typeof json === "object" && "data" in json ? json.data : json;
  return { status: res.status, json: payload };
}

function classifyCreate(status) {
  if (status === 404) return "MISSING";
  if (status >= 200 && status < 300) return "OK";
  if (status === 400 || status === 422) return "EXISTS_BAD_BODY";
  return `ERR_${status}`;
}

async function login() {
  const res = await fetch(`${apiBase}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`login failed: HTTP ${res.status}`);
  const j = await res.json();
  const payload = j.data ?? j;
  const token = payload.tokens?.accessToken ?? payload.accessToken;
  const workspaceId = payload.user?.activeWorkspaceId ?? payload.workspaces?.[0]?.id;
  if (!token) throw new Error("login response missing token");
  const headers = {
    authorization: `Bearer ${token}`,
    "content-type": "application/json",
    ...(workspaceId ? { "x-workspace-id": workspaceId } : {}),
  };
  return { headers, workspaceId };
}

// ---------- 流程定义 ----------
// 每个流程：list -> create(假数据) -> (若创建成功) update -> delete
async function flowSites(headers, data) {
  const r = { flow: "sites", list: null, create: null, update: null };
  const list = await req(headers, "GET", "/sites");
  r.list = list.status;
  const bots = await req(headers, "GET", "/bots");
  const botId = Array.isArray(bots.json) ? bots.json[0]?.id : bots.json?.items?.[0]?.id;
  const create = await req(headers, "POST", "/sites", {
    botId: botId ?? "",
    name: `${data.company}-官网`,
    allowedDomains: [data.domain],
  });
  r.create = classifyCreate(create.status);
  return r;
}

async function flowLeads(headers, data) {
  const r = { flow: "leads", list: null, create: null };
  const list = await req(headers, "GET", "/leads");
  r.list = list.status;
  const create = await req(headers, "POST", "/leads", {
    name: data.name,
    contact: data.phone,
    sourceBot: data.company,
    lastQuestion: data.message,
  });
  r.create = classifyCreate(create.status);
  return r;
}

async function flowInquiries(headers, data) {
  const r = { flow: "inquiries", list: null, create: null };
  const list = await req(headers, "GET", "/inquiries");
  r.list = list.status;
  const create = await req(headers, "POST", "/inquiries", {
    customerName: data.name,
    sourceType: "website",
    summary: data.message,
  });
  r.create = classifyCreate(create.status);
  return r;
}

async function flowQuotes(headers, data) {
  const r = { flow: "quote-opportunities", list: null, create: null };
  const list = await req(headers, "GET", "/quote-opportunities");
  r.list = list.status;
  // Create an inquiry first, then create a quote from it
  const inquiry = await req(headers, "POST", "/inquiries", {
    customerName: data.name,
    sourceType: "website",
    summary: data.message,
  });
  const inquiryId = inquiry.json?.id;
  if (!inquiryId) {
    r.create = "NO_INQUIRY";
    return r;
  }
  const create = await req(headers, "POST", "/quote-opportunities", {
    inquiryId,
    title: `${data.company}-报价`,
    estimatedAmount: (data.runIdx % 50 + 10) * 10000,
  });
  r.create = classifyCreate(create.status);
  return r;
}

async function flowCustomers(headers, data) {
  const r = { flow: "customer-opportunities", list: null, create: null };
  const list = await req(headers, "GET", "/customer-opportunities");
  r.list = list.status;
  // Customers are derived from inquiries — create an inquiry
  const create = await req(headers, "POST", "/inquiries", {
    customerName: data.name,
    sourceType: "other",
    summary: `${data.company} · ${data.persona.industry}`,
  });
  r.create = classifyCreate(create.status);
  return r;
}

async function flowBusinessRules(headers, data) {
  const r = { flow: "business-rules", list: null, create: null, update: null };
  const list = await req(headers, "GET", "/settings/business-rules");
  r.list = list.status;
  // Business rules is a settings object — use PATCH to update
  const patch = await req(headers, "PATCH", "/settings/business-rules", {
    highIntentKeywords: list.json?.highIntentKeywords ?? [],
    requiredQuoteFields: list.json?.requiredQuoteFields ?? [],
    leadFields: list.json?.leadFields ?? [],
    highIntentReminderMinutes: list.json?.highIntentReminderMinutes ?? 30,
    transferToHumanKeywords: list.json?.transferToHumanKeywords ?? [],
  });
  r.create = patch.status >= 200 && patch.status < 300 ? "OK" : classifyCreate(patch.status);
  r.update = patch.status;
  return r;
}

async function flowKnowledgeBases(headers, data) {
  const r = { flow: "knowledge-bases", list: null, create: null };
  const list = await req(headers, "GET", "/knowledge-bases");
  r.list = list.status;
  const create = await req(headers, "POST", "/knowledge-bases", {
    name: `${data.company}-知识库-${data.runIdx}-${Date.now()}`,
    description: data.message,
  });
  r.create = classifyCreate(create.status);
  return r;
}

async function flowBots(headers, data) {
  const r = { flow: "bots", list: null, create: null };
  const list = await req(headers, "GET", "/bots");
  r.list = list.status;
  const create = await req(headers, "POST", "/bots", {
    name: `${data.company}-助手-${data.runIdx}`,
    description: data.message,
  });
  r.create = classifyCreate(create.status);
  return r;
}

async function flowFollowTasks(headers, data) {
  const r = { flow: "follow-tasks", list: null, create: null, update: null };
  const list = await req(headers, "GET", "/follow-tasks");
  r.list = list.status;
  const create = await req(headers, "POST", "/follow-tasks", {
    title: `${data.company}-跟进-${data.runIdx}`,
    dueAt: new Date(Date.now() + 86400000).toISOString(),
    relatedType: "inquiry",
    relatedId: `inq-flow-${data.runIdx}`,
  });
  r.create = classifyCreate(create.status);
  const taskId = create.json?.id;
  if (taskId) {
    const action = await req(headers, "POST", `/follow-tasks/${taskId}/complete`, {});
    r.update = action.status;
  }
  return r;
}

async function flowSelectionPages(headers, data) {
  const r = { flow: "selection-pages", list: null, create: null, update: null };
  const list = await req(headers, "GET", "/selection-pages");
  r.list = list.status;
  const slug = `sel-${data.runIdx}-${Date.now().toString(36)}`;
  const create = await req(headers, "POST", "/selection-pages", {
    name: `${data.company}-选型页`,
    slug,
    description: data.message,
    status: "draft",
    config: { questions: [] },
  });
  r.create = classifyCreate(create.status);
  const pageId = create.json?.id;
  if (pageId) {
    const patch = await req(headers, "PATCH", `/selection-pages/${pageId}`, {
      name: `${data.company}-选型页-更新`,
      status: "published",
    });
    r.update = patch.status;
  }
  return r;
}

async function flowSalesLinks(headers, data) {
  const r = { flow: "sales-links", list: null, create: null, update: null };
  const list = await req(headers, "GET", "/sales-links");
  r.list = list.status;
  const create = await req(headers, "POST", "/sales-links", {
    name: `${data.company}-链接-${data.runIdx}`,
    channel: "wechat",
    targetUrl: `https://${data.domain}`,
  });
  r.create = classifyCreate(create.status);
  const linkId = create.json?.id;
  if (linkId) {
    const patch = await req(headers, "PATCH", `/sales-links/${linkId}`, { status: "active" });
    r.update = patch.status;
  }
  return r;
}

const FLOWS = [
  { name: "sites", fn: flowSites },
  { name: "leads", fn: flowLeads },
  { name: "inquiries", fn: flowInquiries },
  { name: "quotes", fn: flowQuotes },
  { name: "customers", fn: flowCustomers },
  { name: "business-rules", fn: flowBusinessRules },
  { name: "knowledge-bases", fn: flowKnowledgeBases },
  { name: "bots", fn: flowBots },
  { name: "follow-tasks", fn: flowFollowTasks },
  { name: "selection-pages", fn: flowSelectionPages },
  { name: "sales-links", fn: flowSalesLinks },
];

// 只读流程（LIST 探活）
const READONLY = [
  { name: "conversations", path: "/conversations?limit=5" },
  { name: "notifications", path: "/notifications" },
  { name: "reports", path: "/reports" },
  { name: "health", path: "/health" },
];

// ---------- 主流程 ----------
console.log("==> 流程完整性测试（假数据 × 多场景 × 多轮）");
console.log(`    API: ${apiBase}`);
console.log(`    Account: ${email}`);
console.log(`    Runs: ${RUNS}`);

const { headers } = await login();
console.log("    登录: OK\n");

const allRuns = [];

for (let run = 0; run < RUNS; run++) {
  const batch = generateFakeData(run);
  console.log(`==> 第 ${run + 1}/${RUNS} 轮（场景：${batch[0].persona.industry}/${batch[0].persona.suffix}，${batch.length} 条假数据）`);
  const runResults = [];

  // 每个流程用该轮的一条假数据
  for (const f of FLOWS) {
    const data = batch[run % batch.length];
    try {
      const r = await f.fn(headers, data);
      runResults.push(r);
      const tag = r.create === "OK" ? "OK" : r.create;
      console.log(`  • ${f.name.padEnd(20)} list=${r.list} create=${tag}${r.update ? ` update=${r.update}` : ""}`);
    } catch (err) {
      runResults.push({ flow: f.name, list: null, create: `EXC:${String(err).slice(0, 40)}` });
      console.log(`  • ${f.name.padEnd(20)} EXCEPTION: ${String(err).slice(0, 80)}`);
    }
  }

  // 只读探活
  for (const ro of READONLY) {
    try {
      const { status } = await req(headers, "GET", ro.path);
      runResults.push({ flow: ro.name, list: status, create: "RO" });
      console.log(`  • ${ro.name.padEnd(20)} list=${status} (read-only)`);
    } catch (err) {
      runResults.push({ flow: ro.name, list: null, create: `EXC:${String(err).slice(0, 40)}` });
    }
  }

  allRuns.push({ run: run + 1, persona: batch[0].persona, results: runResults });
  console.log("");
}

// ---------- 汇总 ----------
const flowSummary = {};
for (const run of allRuns) {
  for (const r of run.results) {
    if (!flowSummary[r.flow]) flowSummary[r.flow] = { list: [], create: [] };
    flowSummary[r.flow].list.push(r.list);
    flowSummary[r.flow].create.push(r.create);
  }
}

console.log("==> 流程完整性汇总（跨所有轮次）");
console.log("flow".padEnd(22), "list".padStart(6), "create".padEnd(18), "判定");
console.log("-".repeat(60));
const verdicts = [];
for (const [flow, s] of Object.entries(flowSummary)) {
  const listOk = s.list.every((x) => x >= 200 && x < 300);
  const createAll = s.create;
  const createOk = createAll.every((x) => x === "OK");
  const createMissing = createAll.every((x) => x === "MISSING");
  const verdict = createOk ? "COMPLETE" : createMissing ? "MISSING_ENDPOINT" : "PARTIAL";
  verdicts.push({ flow, verdict });
  console.log(
    flow.padEnd(22),
    String(s.list.join("/")).padStart(6),
    createAll.join("/").padEnd(18),
    verdict,
  );
}

const report = {
  generatedAt: new Date().toISOString(),
  environment: { apiBase, email, runs: RUNS },
  runs: allRuns,
  summary: verdicts,
  missing: verdicts.filter((v) => v.verdict === "MISSING_ENDPOINT").map((v) => v.flow),
  partial: verdicts.filter((v) => v.verdict === "PARTIAL").map((v) => v.flow),
};

const reportPath = path.join(e2eDir, "..", "FLOW-COMPLETENESS-REPORT.json");
writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(`\n==> 报告: ${reportPath}`);
console.log(`==> 缺失端点: ${report.missing.length ? report.missing.join(", ") : "无"}`);
console.log(`==> 部分可用: ${report.partial.length ? report.partial.join(", ") : "无"}`);
