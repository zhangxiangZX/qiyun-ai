import assert from "node:assert/strict";
import test from "node:test";

import {
  formatConsultationIntentLabel,
  isHighIntentConversation,
  resolveConversationListIntentLabel,
  shouldPromptLeadCapture,
  LEAD_CAPTURE_COOLDOWN_MS,
} from "./intent-labels";

test("formatConsultationIntentLabel maps known intents", () => {
  assert.equal(formatConsultationIntentLabel("quote"), "报价意向");
  assert.equal(formatConsultationIntentLabel("unknown"), null);
});

test("isHighIntentConversation detects AI and rule-based signals", () => {
  assert.equal(
    isHighIntentConversation({ aiIntent: "quote", aiHighIntentTurnCount: 0, aiLeadCaptureRecommended: false }),
    true,
  );
  assert.equal(
    isHighIntentConversation({ aiIntent: "general", aiHighIntentTurnCount: 1, aiLeadCaptureRecommended: false }),
    true,
  );
  assert.equal(
    isHighIntentConversation({ aiIntent: "general", aiHighIntentTurnCount: 0, aiLeadCaptureRecommended: true }),
    true,
  );
  assert.equal(
    isHighIntentConversation({ aiIntent: "general", aiHighIntentTurnCount: 0, aiLeadCaptureRecommended: false }),
    false,
  );
});

test("resolveConversationListIntentLabel prefers intent label", () => {
  assert.equal(
    resolveConversationListIntentLabel({
      aiIntent: "delivery",
      aiHighIntentTurnCount: 1,
      aiLeadCaptureRecommended: false,
    }),
    "交期咨询",
  );
});

test("shouldPromptLeadCapture respects cooldown window", () => {
  const now = Date.now();
  assert.equal(
    shouldPromptLeadCapture({
      needsLeadCapture: true,
      existingLead: false,
      lastLeadPromptAt: null,
      now,
    }),
    true,
  );
  assert.equal(
    shouldPromptLeadCapture({
      needsLeadCapture: true,
      existingLead: false,
      lastLeadPromptAt: new Date(now - LEAD_CAPTURE_COOLDOWN_MS + 1000).toISOString(),
      now,
    }),
    false,
  );
  assert.equal(
    shouldPromptLeadCapture({
      needsLeadCapture: true,
      existingLead: false,
      lastLeadPromptAt: new Date(now - LEAD_CAPTURE_COOLDOWN_MS - 1000).toISOString(),
      now,
    }),
    true,
  );
});

test("shouldPromptLeadCapture allows repeated high-intent escalation during cooldown", () => {
  const now = Date.now();
  assert.equal(
    shouldPromptLeadCapture({
      needsLeadCapture: true,
      existingLead: false,
      lastLeadPromptAt: new Date(now - 1_000).toISOString(),
      highIntentTurnCount: 2,
      now,
    }),
    true,
  );
});
