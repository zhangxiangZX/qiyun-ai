import test from "node:test";
import assert from "node:assert/strict";

import { buildChatMessages, parseSseChatDeltaLines } from "./llm-chat";

test("parseSseChatDeltaLines extracts streamed content deltas", () => {
  const chunk = [
    "data: {\"choices\":[{\"delta\":{\"content\":\"你好\"}}]}",
    "",
    "data: {\"choices\":[{\"delta\":{\"content\":\"，欢迎咨询\"}}]}",
    "",
    "data: [DONE]",
    "",
  ].join("\n");

  const parsed = parseSseChatDeltaLines(chunk);
  assert.equal(parsed.remainder, "");
  assert.deepEqual(parsed.deltas, ["你好", "，欢迎咨询"]);
});

test("buildChatMessages uses conversational style guide", () => {
  const messages = buildChatMessages({
    botSystemPrompt: "你是售前顾问。",
    contextBlocks: ["[文档A] 支持 IP54 防护。"],
    history: [],
    userMessage: "怎么选型？",
  });

  const system = messages[0]?.content ?? "";
  assert.equal(messages[0]?.role, "system");
  assert.match(system, /像真人微信聊天/);
  assert.match(system, /不要一次在结尾塞 2–3 个/);
  assert.match(system, /用短句、口语化中文/);
  assert.match(system, /\[文档A\] 支持 IP54 防护/);
  assert.doesNotMatch(system, /给出 2 到 3 个可继续咨询的方向/);
});
