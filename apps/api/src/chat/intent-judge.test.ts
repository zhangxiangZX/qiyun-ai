import assert from "node:assert/strict";
import test from "node:test";

import { judgeIntentWithLlm } from "./intent-judge";

test("judgeIntentWithLlm parses structured JSON response", async () => {
  const llmChat = {
    async completeText() {
      return JSON.stringify({
        intent: "quote",
        productLine: "cabinet",
        confidence: 0.91,
        missingFields: ["尺寸", "数量", "图纸"],
        leadCaptureRecommended: true,
      });
    },
  };

  const result = await judgeIntentWithLlm(llmChat as never, {
    message: "这个项目先帮我估一下户外机柜报价。",
  });

  assert.deepEqual(result, {
    intent: "quote",
    productLine: "cabinet",
    confidence: 0.91,
    missingFields: ["尺寸", "数量", "图纸"],
    leadCaptureRecommended: true,
  });
});

test("judgeIntentWithLlm tolerates fenced JSON and invalid enums", async () => {
  const llmChat = {
    async completeText() {
      return [
        "```json",
        JSON.stringify({
          intent: "unknown",
          productLine: "mystery",
          confidence: 2,
          missingFields: ["", "交期", 123],
          leadCaptureRecommended: 1,
        }),
        "```",
      ].join("\n");
    },
  };

  const result = await judgeIntentWithLlm(llmChat as never, {
    message: "项目比较急，先说能不能尽快交付。",
  });

  assert.deepEqual(result, {
    intent: "general",
    productLine: "general",
    confidence: 1,
    missingFields: ["交期"],
    leadCaptureRecommended: true,
  });
});
