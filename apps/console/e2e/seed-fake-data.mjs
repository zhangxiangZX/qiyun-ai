#!/usr/bin/env node
/**
 * 假数据 Seed 脚本
 *
 * 通过 API 批量创建假数据，覆盖多种客户场景。
 * 幂等安全：重复运行不会报错（同名数据创建新记录即可）。
 *
 * 前置：API http://localhost:3001 已启动，存在 owner@qiyun.ai 账号。
 * 用法：node apps/console/e2e/seed-fake-data.mjs
 *   环境变量：SEED_COUNT（默认 20，控制每条线的数量）
 */

const apiBase = (process.env.API_BASE_URL || "http://localhost:3001").replace(/\/$/, "");
const email = process.env.E2E_EMAIL || "owner@qiyun.ai";
const password = process.env.E2E_PASSWORD || "Qiyun@2026";
const SEED_COUNT = Number(process.env.SEED_COUNT || 20);

// ========== 假数据素材 ==========

const INDUSTRIES = [
  { industry: "制造业", suffix: "机械", products: ["数控机床", "注塑机", "激光切割机", "工业机器人", "冲压设备", "焊接设备"] },
  { industry: "电子", suffix: "电子", products: ["PCB 板", "传感器", "连接器", "电源模块", "触摸屏", "继电器"] },
  { industry: "建材", suffix: "建材", products: ["铝型材", "中空玻璃", "防水涂料", "保温板", "瓷砖", "石膏板"] },
  { industry: "医疗器械", suffix: "医疗", products: ["监护仪", "一次性耗材", "超声设备", "手术器械", "输液泵", "呼吸机"] },
  { industry: "新能源", suffix: "新能源", products: ["锂电池", "光伏组件", "充电桩", "逆变器", "风力发电机组", "储能系统"] },
  { industry: "食品", suffix: "食品", products: ["包装机械", "调味料", "冷链设备", "灌装线", "烘焙设备", "质检仪器"] },
  { industry: "化工", suffix: "化工", products: ["催化剂", "涂料原料", "塑料助剂", "表面活性剂", "阻燃剂", "分散剂"] },
  { industry: "物流", suffix: "物流", products: ["仓储管理系统", "AGV 小车", "智能分拣线", "冷链运输车", "叉车", "输送带"] },
];

const SURNAMES = "王李张刘陈杨黄赵周吴徐孙马朱胡林郭何高罗郑梁谢宋唐韩冯董曹袁邓许傅沈曾彭吕苏卢蒋蔡贾丁魏薛叶阎余潘杜戴夏钟汪田任姜范方石姚谭廖邹熊金陆郝孔白崔康毛邱秦江史顾侯邵孟龙万段雷钱汤尹黎易常武乔贺赖龚文".split("");

const GIVEN_NAMES = [
  "伟", "芳", "娜", "敏", "静", "强", "磊", "军", "洋", "勇",
  "艳", "杰", "涛", "明", "超", "霞", "平", "刚", "桂英", "丽",
  "志强", "秀英", "建国", "红梅", "国庆", "淑芬", "文华", "云飞", "天宇", "思远",
  "俊杰", "雅婷", "浩然", "欣怡", "子涵", "梓轩", "昊天", "佳慧", "晨曦", "泽宇",
];

const COMPANY_PREFIXES = [
  "华", "中", "恒", "盛", "泰", "瑞", "嘉", "鑫", "锦", "宏",
  "远", "通", "达", "信", "诚", "博", "丰", "宝", "联", "创",
  "凯", "龙", "翔", "鹏", "鼎", "鸿", "昊", "旭", "辉", "睿",
];

const COMPANY_MIDDLES = [
  "泰", "源", "达", "通", "信", "华", "中", "盛", "宏", "远",
  "恒", "嘉", "瑞", "鑫", "锦", "丰", "博", "宝", "联", "创",
];

const SOURCE_TYPES = ["website", "referral", "exhibition", "ad"];

const LEAD_MESSAGES = [
  "您好，我们对贵公司的产品很感兴趣，请提供详细报价单和技术参数。",
  "我们正在寻找合适的供应商，能否安排产品演示和样品测试？",
  "请问贵司是否有符合我们技术规格的产品？需要批量采购。",
  "我们计划在本季度完成采购决策，希望尽快收到报价。",
  "之前合作的产品质量很好，这次需要追加订单。",
  "听说贵公司在行业口碑不错，想了解一下合作方案。",
  "我们项目进入第二阶段，需要更换供应商，请推荐合适产品。",
  "对贵司新产品很感兴趣，能否提供试用机会？",
  "我们需要定制化解决方案，请安排技术团队对接。",
  "紧急需求，希望三天内收到初步报价。",
];

const INQUIRY_SUMMARIES = [
  "客户咨询产品价格和技术参数，希望获得详细报价单",
  "潜在客户通过网站提交询盘，表达批量采购意向",
  "客户要求产品样品测试，评估是否符合项目需求",
  "展会现场客户对产品感兴趣，希望后续跟进",
  "客户通过广告渠道了解到产品，需要详细技术方案",
  "客户指定规格要求，需要定制化报价",
  "老客户追加采购订单，需要确认交期和价格",
  "客户对比多家供应商，需要差异化方案说明",
];

const KB_NAMES = [
  "产品手册", "FAQ 常见问题", "技术规格文档", "报价模板",
  "售后服务指南", "安装操作手册", "认证资质文档", "材料安全说明",
];

const KB_DESCS = [
  "涵盖全系列产品介绍、技术参数和应用场景",
  "整理客户常见问题及标准解答，方便快速响应",
  "详细技术规格、测试方法和认证标准",
  "标准化报价流程和模板，提升报价效率",
  "售后服务流程、保修政策和常见故障处理",
  "设备安装步骤、调试方法和日常维护要点",
  "ISO、CE、3C 等认证资质汇总",
  "化学品安全数据表、存储运输注意事项",
];

const BOT_NAMES = [
  "售前咨询助手", "售后支持助手", "技术问答助手",
  "产品推荐助手", "报价辅助助手", "订单跟踪助手",
];

const BOT_DESCS = [
  "自动回答客户关于产品价格、规格和方案的售前咨询问题",
  "处理售后常见问题，指导客户完成故障排查和报修流程",
  "基于知识库回答技术问题，提供规格参数和文档链接",
  "根据客户需求智能推荐合适的产品和方案组合",
  "辅助生成报价单，自动匹配产品价格和折扣规则",
  "实时跟踪订单状态，自动通知客户物流信息",
];

const BOT_MODELS = ["gpt-4o", "gpt-4o-mini", "deepseek-chat", "qwen-plus"];

const SITE_NAMES = [
  "官网", "产品展示站", "在线商城", "技术支持站",
  "客户服务中心", "展会专题页", "品牌宣传站", "合作伙伴门户",
];

// ========== 假数据生成 ==========

function pick(arr, seed) {
  return arr[Math.abs(seed) % arr.length];
}

function fakePersonName(seed) {
  return pick(SURNAMES, seed) + pick(GIVEN_NAMES, seed * 7 + 3);
}

function fakeCompanyName(seed, industry) {
  const prefix = pick(COMPANY_PREFIXES, seed);
  const middle = pick(COMPANY_MIDDLES, seed * 3 + 1);
  const suffix = industry.suffix;
  return `${prefix}${middle}${suffix}有限公司`;
}

function fakePhone(seed) {
  const prefixes = ["13", "15", "18", "19"];
  let s = pick(prefixes, seed);
  for (let i = 0; i < 9; i++) s += (Math.abs(seed * 3 + i * 7) % 10);
  return s;
}

function fakeEmail(name, seed) {
  const pool = "abcdefghijklmnopqrstuvwxyz";
  let s = "";
  for (let i = 0; i < 6; i++) s += pool[(Math.abs(name.charCodeAt(i % name.length)) + i * 3) % 26];
  return `${s}${Math.abs(seed) % 100}@example.com`;
}

function fakeDomain(seed, suffix) {
  const pool = "abcdefghijklmnopqrstuvwxyz";
  let s = "";
  for (let i = 0; i < 5; i++) s += pool[(Math.abs(seed * 13 + i * 7) % 26)];
  return `${s}-${suffix}.cn`;
}

function fakeAmount(seed) {
  // 5万 ~ 200万，偏合理的金额
  const base = (Math.abs(seed) % 40 + 5) * 10000;
  const multiplier = ((Math.abs(seed * 3) % 4) + 1); // 1~4
  return base * multiplier;
}

// ========== 请求工具 ==========

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
    json = text.slice(0, 200);
  }
  return { status: res.status, json };
}

async function login() {
  const res = await fetch(`${apiBase}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`登录失败: HTTP ${res.status}`);
  const j = await res.json();
  const token = j.tokens?.accessToken ?? j.accessToken;
  const workspaceId = j.user?.activeWorkspaceId ?? j.workspaces?.[0]?.id;
  if (!token) throw new Error("登录响应缺少 token");
  const headers = {
    authorization: `Bearer ${token}`,
    "content-type": "application/json",
    ...(workspaceId ? { "x-workspace-id": workspaceId } : {}),
  };
  return { headers, workspaceId };
}

// ========== 批量创建 ==========

async function seedLeads(headers, count) {
  const results = { total: 0, success: 0, fail: 0 };
  for (let i = 0; i < count; i++) {
    const seed = i * 17 + 31;
    const industry = pick(INDUSTRIES, seed);
    const name = fakePersonName(seed);
    const company = fakeCompanyName(seed, industry);
    const product = pick(industry.products, seed);
    const budget = fakeAmount(seed);
    const message = pick(LEAD_MESSAGES, seed * 3).replace("产品", product);

    const body = {
      name: `${name}-${company}`,
      contact: fakePhone(seed),
      sourceBot: `${company}-${pick(BOT_NAMES, seed * 2).replace("助手", "")}`,
      lastQuestion: message + `，预算约${budget / 10000}万元，${industry.industry}场景。`,
    };

    const { status, json } = await req(headers, "POST", "/leads", body);
    results.total++;
    if (status >= 200 && status < 300) {
      results.success++;
    } else {
      results.fail++;
      console.log(`  [leads] #${i + 1} 失败: HTTP ${status}`, typeof json === "string" ? json : JSON.stringify(json).slice(0, 120));
    }
  }
  return results;
}

async function seedInquiries(headers, count) {
  const results = { total: 0, success: 0, fail: 0, ids: [] };
  for (let i = 0; i < count; i++) {
    const seed = i * 23 + 7;
    const industry = pick(INDUSTRIES, seed);
    const name = fakePersonName(seed);
    const company = fakeCompanyName(seed, industry);
    const product = pick(industry.products, seed);
    const sourceType = pick(SOURCE_TYPES, seed);
    const summary = pick(INQUIRY_SUMMARIES, seed * 5).replace("产品", product) + `（${company}，${industry.industry}）`;

    const body = {
      customerName: `${name}@${company}`,
      sourceType,
      summary,
    };

    const { status, json } = await req(headers, "POST", "/inquiries", body);
    results.total++;
    if (status >= 200 && status < 300) {
      results.success++;
      const id = json?.id ?? json?.data?.id;
      if (id) results.ids.push(id);
    } else {
      results.fail++;
      console.log(`  [inquiries] #${i + 1} 失败: HTTP ${status}`, typeof json === "string" ? json : JSON.stringify(json).slice(0, 120));
    }
  }
  return results;
}

async function seedQuoteOpportunities(headers, count, inquiryIds) {
  const results = { total: 0, success: 0, fail: 0 };
  // 如果没有 inquiryIds，先创建
  if (!inquiryIds || inquiryIds.length === 0) {
    const inquiryResults = await seedInquiries(headers, count);
    inquiryIds = inquiryResults.ids;
  }

  for (let i = 0; i < count; i++) {
    const seed = i * 19 + 11;
    const industry = pick(INDUSTRIES, seed);
    const company = fakeCompanyName(seed, industry);
    const product = pick(industry.products, seed);
    const amount = fakeAmount(seed);
    const inquiryId = inquiryIds[i % inquiryIds.length];

    const body = {
      inquiryId,
      title: `${company}-${product}-报价`,
      estimatedAmount: amount,
    };

    const { status, json } = await req(headers, "POST", "/quote-opportunities", body);
    results.total++;
    if (status >= 200 && status < 300) {
      results.success++;
    } else {
      results.fail++;
      console.log(`  [quotes] #${i + 1} 失败: HTTP ${status}`, typeof json === "string" ? json : JSON.stringify(json).slice(0, 120));
    }
  }
  return results;
}

async function seedKnowledgeBases(headers, count) {
  const results = { total: 0, success: 0, fail: 0 };
  for (let i = 0; i < count; i++) {
    const seed = i * 29 + 13;
    const industry = pick(INDUSTRIES, seed);
    const kbName = pick(KB_NAMES, seed);
    const kbDesc = pick(KB_DESCS, seed);
    const company = fakeCompanyName(seed, industry);

    const body = {
      name: `${company}-${kbName}-${i + 1}`,
      description: `${kbDesc}，适用${industry.industry}领域。`,
    };

    const { status, json } = await req(headers, "POST", "/knowledge-bases", body);
    results.total++;
    if (status >= 200 && status < 300) {
      results.success++;
    } else {
      results.fail++;
      console.log(`  [knowledge-bases] #${i + 1} 失败: HTTP ${status}`, typeof json === "string" ? json : JSON.stringify(json).slice(0, 120));
    }
  }
  return results;
}

async function seedBots(headers, count) {
  const results = { total: 0, success: 0, fail: 0, ids: [] };
  for (let i = 0; i < count; i++) {
    const seed = i * 31 + 17;
    const industry = pick(INDUSTRIES, seed);
    const company = fakeCompanyName(seed, industry);
    const botName = pick(BOT_NAMES, seed);
    const botDesc = pick(BOT_DESCS, seed);
    const model = pick(BOT_MODELS, seed * 2);

    const body = {
      name: `${company}-${botName}-${i + 1}`,
      description: `${botDesc}，专注于${industry.industry}领域。`,
      model,
    };

    const { status, json } = await req(headers, "POST", "/bots", body);
    results.total++;
    if (status >= 200 && status < 300) {
      results.success++;
      const id = json?.id ?? json?.data?.id;
      if (id) results.ids.push(id);
    } else {
      results.fail++;
      console.log(`  [bots] #${i + 1} 失败: HTTP ${status}`, typeof json === "string" ? json : JSON.stringify(json).slice(0, 120));
    }
  }
  return results;
}

async function seedSites(headers, count, botIds) {
  const results = { total: 0, success: 0, fail: 0 };
  // 如果没有 botIds，先创建
  if (!botIds || botIds.length === 0) {
    const botResults = await seedBots(headers, count);
    botIds = botResults.ids;
  }

  for (let i = 0; i < count; i++) {
    const seed = i * 37 + 23;
    const industry = pick(INDUSTRIES, seed);
    const company = fakeCompanyName(seed, industry);
    const siteName = pick(SITE_NAMES, seed);
    const domain = fakeDomain(seed, industry.suffix);
    const botId = botIds[i % botIds.length];

    const body = {
      botId,
      name: `${company}-${siteName}`,
      allowedDomains: [domain],
    };

    const { status, json } = await req(headers, "POST", "/sites", body);
    results.total++;
    if (status >= 200 && status < 300) {
      results.success++;
    } else {
      results.fail++;
      console.log(`  [sites] #${i + 1} 失败: HTTP ${status}`, typeof json === "string" ? json : JSON.stringify(json).slice(0, 120));
    }
  }
  return results;
}

// ========== 主流程 ==========

console.log("==> 假数据 Seed 脚本");
console.log(`    API: ${apiBase}`);
console.log(`    每条线数量: ${SEED_COUNT}`);
console.log(`    账号: ${email}\n`);

const { headers } = await login();
console.log("    登录: OK\n");

// 1. 线索 (leads)
console.log(`==> 创建线索 (leads) × ${SEED_COUNT}`);
const leadsResults = await seedLeads(headers, SEED_COUNT);
console.log(`    成功: ${leadsResults.success}/${leadsResults.total}\n`);

// 2. 询盘 (inquiries) — 同时收集 id 供报价使用
console.log(`==> 创建询盘 (inquiries) × ${SEED_COUNT}`);
const inquiriesResults = await seedInquiries(headers, SEED_COUNT);
console.log(`    成功: ${inquiriesResults.success}/${inquiriesResults.total}\n`);

// 3. 报价 (quote-opportunities) — 使用 inquiryIds
console.log(`==> 创建报价 (quote-opportunities) × ${SEED_COUNT}`);
const quotesResults = await seedQuoteOpportunities(headers, SEED_COUNT, inquiriesResults.ids);
console.log(`    成功: ${quotesResults.success}/${quotesResults.total}\n`);

// 4. 知识库 (knowledge-bases)
console.log(`==> 创建知识库 (knowledge-bases) × ${SEED_COUNT}`);
const kbResults = await seedKnowledgeBases(headers, SEED_COUNT);
console.log(`    成功: ${kbResults.success}/${kbResults.total}\n`);

// 5. 机器人 (bots) — 同时收集 id 供站点使用
console.log(`==> 创建机器人 (bots) × ${SEED_COUNT}`);
const botsResults = await seedBots(headers, SEED_COUNT);
console.log(`    成功: ${botsResults.success}/${botsResults.total}\n`);

// 6. 站点 (sites) — 使用 botIds
console.log(`==> 创建站点 (sites) × ${SEED_COUNT}`);
const sitesResults = await seedSites(headers, SEED_COUNT, botsResults.ids);
console.log(`    成功: ${sitesResults.success}/${sitesResults.total}\n`);

// ========== 汇总 ==========

const allResults = [
  { name: "线索 (leads)", ...leadsResults },
  { name: "询盘 (inquiries)", ...inquiriesResults },
  { name: "报价 (quote-opportunities)", ...quotesResults },
  { name: "知识库 (knowledge-bases)", ...kbResults },
  { name: "机器人 (bots)", ...botsResults },
  { name: "站点 (sites)", ...sitesResults },
];

console.log("==> 创建结果汇总");
console.log("类型".padEnd(24), "总数".padStart(6), "成功".padStart(6), "失败".padStart(6), "成功率".padStart(8));
console.log("-".repeat(58));

let grandTotal = 0, grandSuccess = 0, grandFail = 0;
for (const r of allResults) {
  const rate = r.total > 0 ? `${((r.success / r.total) * 100).toFixed(1)}%` : "N/A";
  console.log(r.name.padEnd(24), String(r.total).padStart(6), String(r.success).padStart(6), String(r.fail).padStart(6), rate.padStart(8));
  grandTotal += r.total;
  grandSuccess += r.success;
  grandFail += r.fail;
}

const grandRate = grandTotal > 0 ? `${((grandSuccess / grandTotal) * 100).toFixed(1)}%` : "N/A";
console.log("-".repeat(58));
console.log("合计".padEnd(24), String(grandTotal).padStart(6), String(grandSuccess).padStart(6), String(grandFail).padStart(6), grandRate.padStart(8));

if (grandFail > 0) {
  console.log(`\n==> 有 ${grandFail} 条创建失败，请检查上方日志`);
} else {
  console.log("\n==> 全部创建成功！");
}
