#!/usr/bin/env node
/**
 * Run Kuzimash public chat regression cases from reference-测试用例.md
 */
const API = process.env.API_BASE ?? "http://localhost:3001";
const BOT_ID = process.env.BOT_ID ?? "bot_23870d5a-e503-4ede-9dd2-c19b6f7b4148";
const SITE_KEY = process.env.SITE_KEY ?? "pk_7665998f-4eb4-4f52-ba1f-2aafe1b5b241";
const ORIGIN = process.env.ORIGIN ?? "http://localhost:3010";

const CASES = [
  { id: 1, question: "你们主要做什么产品？", expect: [/机柜|机箱|操作台|悬臂|温控/] },
  { id: 2, question: "我需要一个壁挂箱，怎么选？", expect: [/ME|壁挂|尺寸|环境/] },
  { id: 3, question: "有操作台和悬臂吗？", expect: [/操作台|悬臂|HPSD|HPXM/] },
  { id: 4, question: "机柜空调和风机怎么选？", expect: [/发热|尺寸|环境|温控/] },
  { id: 5, question: "我要 10 台 800×600×2000 的户外机柜，能报价吗？", expect: [/工程师|报价|联系|留|确认/], forbid: [/^\s*\d+(\.\d+)?\s*元/m] },
  { id: 6, question: "沿海环境用什么机柜？", expect: [/户外|防腐|环境|工程师/] },
  { id: 7, question: "可以按 CAD 图纸定制吗？", expect: [/定制|图纸|工程师|联系/] },
  { id: 8, question: "电柜里发热大，需要空调，怎么选？", expect: [/发热|空调|尺寸|环境/] },
  { id: 9, question: "交期多久？", expect: [/工程师|确认|联系|留/], forbid: [/^\s*\d+\s*天/m] },
  { id: 10, question: "你们有 IP65 和 CE 吗？", expect: [/资料|证书|工程师|确认/], forbid: [/旧站/] },
  { id: 11, question: "你们 FS 柜某个尺寸的价格是多少？", expect: [/资料|工程师|确认|留/], forbid: [/^\s*\d+(\.\d+)?\s*元/m] },
  { id: 12, question: "你们某型号现货多少？", expect: [/资料|工程师|确认|库存/], forbid: [/现货充足/] },
  { id: 13, question: "CE 证书编号是什么？", expect: [/资料|工程师|确认|证书/], forbid: [/CE-\d+/] },
  { id: 14, question: "能保证盐雾 1000 小时吗？", expect: [/工程师|确认|资料/], forbid: [/可以保证|1000\s*小时/] },
];

async function ask(question, visitorId, conversationId) {
  const res = await fetch(`${API}/public/chat/stream`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      botId: BOT_ID,
      siteKey: SITE_KEY,
      visitorId,
      conversationId,
      sdkVersion: "1.2.0",
      origin: ORIGIN,
      message: question,
    }),
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  const text = await res.text();
  let reply = "";
  let nextConversationId = conversationId ?? "";

  for (const block of text.split("\n\n")) {
    const eventLine = block.split("\n").find((line) => line.startsWith("event:"));
    const dataLine = block.split("\n").find((line) => line.startsWith("data:"));
    if (!eventLine || !dataLine) continue;
    const event = eventLine.slice(6).trim();
    const data = JSON.parse(dataLine.slice(5).trim());
    if (event === "meta" && data.conversationId) {
      nextConversationId = data.conversationId;
    }
    if (event === "done" && typeof data.content === "string") {
      reply = data.content;
    }
  }

  return { reply, conversationId: nextConversationId };
}

async function main() {
  let passed = 0;
  let failed = 0;

  for (const testCase of CASES) {
    const visitorId = `reg_${testCase.id}_${Date.now()}`;
    try {
      const { reply } = await ask(testCase.question, visitorId);
      const missing = testCase.expect.filter((pattern) => !pattern.test(reply));
      const forbidden = (testCase.forbid ?? []).filter((pattern) => pattern.test(reply));

      if (missing.length || forbidden.length) {
        failed += 1;
        console.log(`FAIL #${testCase.id} ${testCase.question}`);
        if (missing.length) console.log(`  missing: ${missing.map(String).join(", ")}`);
        if (forbidden.length) console.log(`  forbidden matched: ${forbidden.map(String).join(", ")}`);
        console.log(`  reply: ${reply.slice(0, 180).replace(/\s+/g, " ")}...`);
      } else {
        passed += 1;
        console.log(`PASS #${testCase.id} ${testCase.question}`);
      }
    } catch (error) {
      failed += 1;
      console.log(`ERROR #${testCase.id} ${testCase.question}: ${error.message ?? error}`);
    }
  }

  console.log(`\nSummary: ${passed} passed, ${failed} failed / ${CASES.length}`);
  process.exit(failed ? 1 : 0);
}

main();
