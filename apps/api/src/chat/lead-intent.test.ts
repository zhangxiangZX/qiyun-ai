import assert from "node:assert/strict";
import test from "node:test";

import {
  applyLeadCaptureRules,
  detectHighIntent,
  extractKeyQuestion,
  validateLeadFields,
} from "./lead-intent";
import {
  buildLeadCaptureCoaching,
  buildRetrievalQuery,
  buildSuggestedQuestions,
  detectConsultationIntent,
  inferProductLine,
} from "./follow-up-suggestions";
import type { BotRecord } from "../rag/rag.types";
import type { RagSearchResult } from "../rag/rag.types";

const bot: BotRecord = {
  id: "bot_1",
  workspaceId: "ws_1",
  name: "Demo",
  status: "active",
  knowledgeBaseIds: [],
  description: "",
  welcomeMessage: "",
  recommendedQuestions: [],
  systemPrompt: "",
  collectLeadsOnFailure: true,
  rateLimitPerMinute: 30,
  allowedDomains: [],
  leadFields: ["name", "phone", "company", "requirement"],
  llmTemperature: 0.3,
  maxOutputTokens: 1024,
  updatedAt: new Date().toISOString(),
};

const baseRetrieval: RagSearchResult = {
  botId: "bot_1",
  workspaceId: "ws_1",
  query: "test",
  citations: [
    {
      chunkId: "c1",
      knowledgeBaseId: "kb1",
      documentId: "d1",
      title: "机柜温控手册",
      sectionTitle: null,
      score: 0.9,
      snippet: "机柜温控方案需要结合发热量、柜体尺寸和环境温度综合选型。",
    },
  ],
  contextBlocks: [],
  needsLeadCapture: false,
  retrievalScore: 0.9,
};

test("detectHighIntent matches industrial keywords", () => {
  assert.equal(detectHighIntent("这台设备报价是多少？"), true);
  assert.equal(detectHighIntent("有 CAD 图纸吗"), true);
  assert.equal(detectHighIntent("保修多久"), false);
});

test("applyLeadCaptureRules forces capture on high intent even with good RAG", () => {
  const result = applyLeadCaptureRules(baseRetrieval, bot, "请发一份报价单");
  assert.equal(result.needsLeadCapture, true);
});

test("applyLeadCaptureRules respects collectLeadsOnFailure off on rag miss", () => {
  const miss = { ...baseRetrieval, needsLeadCapture: true, citations: [], retrievalScore: null };
  const result = applyLeadCaptureRules(miss, { ...bot, collectLeadsOnFailure: false }, "通用问题");
  assert.equal(result.needsLeadCapture, false);
});

test("validateLeadFields requires a contact field", () => {
  assert.throws(
    () =>
      validateLeadFields(bot.leadFields, {
        name: "张工",
        phone: "",
        email: "",
        company: "Acme",
        requirement: "询价",
      }),
    /电话|邮箱/,
  );
});

test("extractKeyQuestion uses first user message", () => {
  assert.equal(
    extractKeyQuestion([
      { role: "assistant", content: "欢迎咨询" },
      { role: "user", content: "冷水机怎么选型" },
    ]),
    "冷水机怎么选型",
  );
});

test("detectConsultationIntent classifies quote and delivery queries", () => {
  assert.equal(detectConsultationIntent("这套方案怎么报价？"), "quote");
  assert.equal(detectConsultationIntent("标准机多久能发货？"), "delivery");
});

test("inferProductLine recognizes temperature-control context", () => {
  assert.equal(
    inferProductLine({
      query: "机柜温控怎么选型",
      citations: baseRetrieval.citations,
    }),
    "temperature-control",
  );
});

test("buildRetrievalQuery expands generic company questions", () => {
  const result = buildRetrievalQuery("你们主要做什么产品？");
  assert.match(result, /产品系列/);
  assert.match(result, /机柜/);
  assert.match(result, /温控/);
});

test("buildLeadCaptureCoaching strengthens quote collection prompts", () => {
  const result = buildLeadCaptureCoaching({
    intent: "quote",
    productLine: "cabinet",
  });
  assert.match(result, /数量/);
  assert.match(result, /图纸/);
});

test("buildSuggestedQuestions returns proactive follow-up prompts", () => {
  const result = buildSuggestedQuestions({
    query: "机柜温控怎么选型",
    citations: baseRetrieval.citations,
    needsLeadCapture: false,
  });

  assert.equal(result.length, 3);
  assert.match(result.join(" "), /发热量|安装环境|尺寸|场景/);
});
