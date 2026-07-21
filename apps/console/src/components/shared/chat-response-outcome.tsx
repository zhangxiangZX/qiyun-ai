"use client";

import { BookOpenText, Headphones, UserRound } from "lucide-react";

import { Alert, Badge } from "@qiyun/ui";

export type ChatResponseOutcomeKind =
  | "knowledge_hit"
  | "low_score"
  | "no_knowledge"
  | "needs_lead"
  | "needs_followup"
  | "service_error"
  | "empty_kb";

const LOW_SCORE_THRESHOLD = 0.6;

export function inferChatResponseOutcome(input: {
  citations?: Array<{ score?: number } | unknown> | null;
  needsLeadCapture?: boolean;
  unresolved?: boolean;
  emptyKnowledgeBase?: boolean;
  serviceError?: boolean;
}): ChatResponseOutcomeKind {
  if (input.serviceError) {
    return "service_error";
  }
  if (input.emptyKnowledgeBase) {
    return "empty_kb";
  }
  if (input.citations?.length) {
    const scores = input.citations
      .map((item) =>
        item && typeof item === "object" && "score" in item && typeof item.score === "number"
          ? item.score
          : null,
      )
      .filter((score): score is number => score != null);
    if (scores.length > 0 && scores.every((score) => score < LOW_SCORE_THRESHOLD)) {
      return "low_score";
    }
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
  low_score: {
    title: "低相关命中",
    description: "检索到了片段，但相关度偏低，回答仅供参考；建议补充更贴近问题的文档。",
    variant: "warning",
  },
  no_knowledge: {
    title: "未命中知识库",
    description: "本次回复未检索到可用文档，建议补充知识库或优化提问表述。",
    variant: "info",
  },
  empty_kb: {
    title: "知识库为空",
    description: "当前助手未绑定可用文档，请先上传并等待索引完成后再测试。",
    variant: "warning",
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
  service_error: {
    title: "服务暂时不可用",
    description: "问答服务返回错误，请稍后重试；下方不会用示例回复冒充真实结果。",
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
    outcome === "knowledge_hit" || outcome === "low_score"
      ? BookOpenText
      : outcome === "needs_lead"
        ? UserRound
        : Headphones;

  const variant =
    outcome === "knowledge_hit"
      ? ("success" as const)
      : outcome === "no_knowledge"
        ? ("outline" as const)
        : outcome === "service_error"
          ? ("destructive" as const)
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
