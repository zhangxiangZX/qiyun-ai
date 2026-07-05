import assert from "node:assert/strict";
import test from "node:test";

import {
  MAX_RECOMMENDED_QUESTION_LENGTH,
  MAX_RECOMMENDED_QUESTIONS,
  normalizeRecommendedQuestions,
} from "./recommended-questions";

test("normalizeRecommendedQuestions trims, dedupes, and caps count", () => {
  const result = normalizeRecommendedQuestions([
    "  报价多少？  ",
    "报价多少？",
    "支持定制吗？",
    "",
    "x".repeat(MAX_RECOMMENDED_QUESTION_LENGTH + 1),
    42,
    "交期多久？",
    "图纸要求",
    "采购流程",
    "售后政策",
    "安装方式",
    "第七个问题",
  ]);

  assert.deepEqual(result, [
    "报价多少？",
    "支持定制吗？",
    "交期多久？",
    "图纸要求",
    "采购流程",
    "售后政策",
  ]);
  assert.equal(result.length, MAX_RECOMMENDED_QUESTIONS);
});

test("normalizeRecommendedQuestions returns empty array for invalid input", () => {
  assert.deepEqual(normalizeRecommendedQuestions(null), []);
  assert.deepEqual(normalizeRecommendedQuestions("bad"), []);
});
