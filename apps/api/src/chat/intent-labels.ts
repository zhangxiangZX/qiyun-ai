import type { ConversationMetaRecord } from "./chat.repository";

const INTENT_LABELS: Record<string, string> = {
  quote: "报价意向",
  delivery: "交期咨询",
  customization: "定制需求",
  selection: "选型咨询",
  parameters: "参数咨询",
  general: "一般咨询",
};

const HIGH_INTENT_INTENTS = new Set(["quote", "delivery", "customization"]);

export function formatConsultationIntentLabel(
  intent: string | null | undefined,
): string | null {
  if (!intent) return null;
  return INTENT_LABELS[intent] ?? null;
}

export function isHighIntentConversation(
  meta: Pick<
    ConversationMetaRecord,
    "aiIntent" | "aiHighIntentTurnCount" | "aiLeadCaptureRecommended"
  > | null | undefined,
): boolean {
  if (!meta) return false;
  if ((meta.aiHighIntentTurnCount ?? 0) >= 1) return true;
  if (meta.aiLeadCaptureRecommended) return true;
  return HIGH_INTENT_INTENTS.has(meta.aiIntent ?? "");
}

export function resolveConversationListIntentLabel(
  meta: Pick<
    ConversationMetaRecord,
    "aiIntent" | "aiHighIntentTurnCount" | "aiLeadCaptureRecommended"
  > | null | undefined,
): string | null {
  if (!isHighIntentConversation(meta)) return null;
  return (
    formatConsultationIntentLabel(meta?.aiIntent) ??
    (meta?.aiLeadCaptureRecommended ? "留资推荐" : "高意向")
  );
}

/** Same-session lead form should not re-open within this window. */
export const LEAD_CAPTURE_COOLDOWN_MS = 3 * 60 * 1000;

export function shouldPromptLeadCapture(input: {
  needsLeadCapture: boolean;
  existingLead: boolean;
  lastLeadPromptAt: string | null | undefined;
  highIntentTurnCount?: number;
  now?: number;
}): boolean {
  if (!input.needsLeadCapture || input.existingLead) return false;
  if ((input.highIntentTurnCount ?? 0) >= 2) return true;
  if (!input.lastLeadPromptAt) return true;
  const elapsed = (input.now ?? Date.now()) - new Date(input.lastLeadPromptAt).getTime();
  return elapsed >= LEAD_CAPTURE_COOLDOWN_MS;
}
