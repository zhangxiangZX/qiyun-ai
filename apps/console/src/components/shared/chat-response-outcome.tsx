"use client";

import { BookOpenText, Headphones, UserRound } from "lucide-react";

import { Alert, Badge } from "@qiyun/ui";

export type ChatResponseOutcomeKind =
  | "knowledge_hit"
  | "no_knowledge"
  | "needs_lead"
  | "needs_followup";

export function inferChatResponseOutcome(input: {
  citations?: unknown[] | null;
  needsLeadCapture?: boolean;
  unresolved?: boolean;
}): ChatResponseOutcomeKind {
  if (input.citations?.length) {
    return "knowledge_hit";
  }
  if (input.needsLeadCapture) {
    return "needs_lead";
  }
  if (input.unresolved) {
    return "needs_followup";
  }
  return "no_knowledge";
}

const OUTCOME_COPY: Record<
  ChatResponseOutcomeKind,
  { title: string; description: string; variant: "success" | "info" | "warning" }
> = {
  knowledge_hit: {
    title: "已命中知识库",
    description: "回复引用了以下知识片段，可信度见卡片标注。",
    variant: "success",
  },
  no_knowledge: {
    title: "未命中知识库",
    description: "本次回复未检索到可用文档，建议补充知识库或优化提问表述。",
    variant: "info",
  },
  needs_lead: {
    title: "建议引导留资",
    description: "机器人判断当前问题需要留资或人工跟进，可配置留资表单收集访客信息。",
    variant: "warning",
  },
  needs_followup: {
    title: "建议人工跟进",
    description: "会话标记为未解决，且未命中知识库，适合转人工或补充文档后重试。",
    variant: "warning",
  },
};

export function ChatResponseOutcomeBadge({
  outcome,
  compact = false,
}: {
  outcome: ChatResponseOutcomeKind;
  compact?: boolean;
}) {
  const copy = OUTCOME_COPY[outcome];
  const Icon =
    outcome === "knowledge_hit"
      ? BookOpenText
      : outcome === "needs_lead"
        ? UserRound
        : Headphones;

  const variant =
    outcome === "knowledge_hit"
      ? ("success" as const)
      : outcome === "no_knowledge"
        ? ("outline" as const)
        : ("warning" as const);

  return (
    <Badge variant={variant} className={compact ? "gap-1" : "gap-1.5"}>
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {copy.title}
    </Badge>
  );
}

export function ChatResponseOutcomeBanner({
  outcome,
  compact = false,
}: {
  outcome: ChatResponseOutcomeKind;
  compact?: boolean;
}) {
  if (outcome === "knowledge_hit" && compact) {
    return null;
  }

  const copy = OUTCOME_COPY[outcome];

  return (
    <Alert variant={copy.variant} title={copy.title}>
      {copy.description}
    </Alert>
  );
}
