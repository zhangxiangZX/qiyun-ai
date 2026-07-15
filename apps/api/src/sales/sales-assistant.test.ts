import assert from "node:assert/strict";
import test from "node:test";

import { analyzeSalesContent } from "./sales-assistant.service";
import { defaultBusinessRulesPayload } from "./sales.repository";

test("analyzeSalesContent flags price and delivery risks", () => {
  const result = analyzeSalesContent({
    text: "我们需要 20 台户外机柜，请问报价和交期多少？",
    rules: defaultBusinessRulesPayload(),
  });

  assert.match(result.summary, /户外机柜/);
  assert.ok(result.missingParameters.length > 0);
  assert.ok(result.riskNotes.some((note) => /价格|交期/u.test(note)));
  assert.match(result.suggestedReply, /工程师确认|正式报价/u);
});

test("analyzeSalesContent extracts quantity parameter", () => {
  const result = analyzeSalesContent({
    text: "需要 20 台不锈钢控制柜，室内安装",
    rules: defaultBusinessRulesPayload(),
  });

  assert.equal(result.knownParameters.quantity, "20 台");
});
