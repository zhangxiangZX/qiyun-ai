import assert from "node:assert/strict";
import test from "node:test";

import { defaultBusinessRulesPayload } from "../sales/sales.repository";
import {
  extractQuickEntryFields,
  extractQuickEntryFieldsWithLlm,
} from "./quick-entry-extract";

test("extractQuickEntryFields extracts structured industrial inquiry fields", () => {
  const result = extractQuickEntryFields(
    "浙江迅达通信技术有限公司，联系人李经理，电话 138 5712 6688，需要户外一体化机柜 20台，预算8-12万元，交期6月底前，来自展会，请尽快报价。",
    defaultBusinessRulesPayload(),
  );

  assert.match(result.customerName, /浙江迅达通信技术有限公司/);
  assert.equal(result.contact, "李经理");
  assert.equal(result.phone, "13857126688");
  assert.match(result.productNeed, /户外一体化机柜/);
  assert.equal(result.quantity, "20台");
  assert.equal(result.budget, "8-12万元");
  assert.equal(result.deliveryDate, "6月底前");
  assert.equal(result.sourceType, "expo");
  assert.equal(result.intentLevel, "high");
  assert.equal(result.suggestedFields.knownParameters.quantity, "20台");
  assert.equal(result.extractMode, "rules");
});

test("extractQuickEntryFields detects wechat source and contact title", () => {
  const result = extractQuickEntryFields(
    "微信客户咨询防水连接器，联系人王工，电话 13901582233。",
    defaultBusinessRulesPayload(),
  );

  assert.equal(result.sourceType, "wechat");
  assert.equal(result.contact, "王工");
  assert.equal(result.phone, "13901582233");
  assert.equal(result.intentLevel, "medium");
});

test("extractQuickEntryFields truncates long summaries without losing extraction", () => {
  const text = `官网表单，客户：远航设备有限公司，邮箱 buyer@example.com，需要检测设备 3套。${"补充说明".repeat(60)}`;
  const result = extractQuickEntryFields(text, defaultBusinessRulesPayload());

  assert.equal(result.sourceType, "website");
  assert.equal(result.email, "buyer@example.com");
  assert.equal(result.quantity, "3套");
  assert.equal(result.summary.length, 200);
  assert.ok(result.summary.endsWith("..."));
});

test("extractQuickEntryFieldsWithLlm prefers LLM fields and marks extractMode", async () => {
  const llmChat = {
    async completeText() {
      return JSON.stringify({
        customerName: "华南电气股份有限公司",
        contact: "赵工",
        phone: "18600001111",
        email: "",
        sourceType: "wechat",
        productNeed: "户外机柜温控方案",
        quantity: "5套",
        budget: "约15万",
        deliveryDate: "两个月内",
        intentLevel: "high",
        summary: "微信线索咨询户外机柜温控，约5套，预算15万。",
      });
    },
  };

  const result = await extractQuickEntryFieldsWithLlm(
    llmChat as never,
    "赵工微信里说华南电气要看户外机柜温控，大概5套，预算十五万左右，两个月内要。",
    defaultBusinessRulesPayload(),
  );

  assert.equal(result.extractMode, "llm");
  assert.equal(result.customerName, "华南电气股份有限公司");
  assert.equal(result.contact, "赵工");
  assert.equal(result.phone, "18600001111");
  assert.equal(result.sourceType, "wechat");
  assert.equal(result.productNeed, "户外机柜温控方案");
  assert.equal(result.quantity, "5套");
  assert.equal(result.budget, "约15万");
  assert.equal(result.intentLevel, "high");
});

test("extractQuickEntryFieldsWithLlm falls back to rules when LLM fails", async () => {
  const llmChat = {
    async completeText() {
      throw new Error("upstream down");
    },
  };

  const result = await extractQuickEntryFieldsWithLlm(
    llmChat as never,
    "微信客户咨询防水连接器，联系人王工，电话 13901582233。",
    defaultBusinessRulesPayload(),
  );

  assert.equal(result.extractMode, "rules");
  assert.equal(result.contact, "王工");
  assert.equal(result.phone, "13901582233");
  assert.equal(result.sourceType, "wechat");
});
