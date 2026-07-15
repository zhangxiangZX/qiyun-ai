"use client";

import { Badge } from "@qiyun/ui";

import type { IntentLevel, QuoteStage } from "@/lib/sales/types";
import { INTENT_LABELS, QUOTE_STAGE_LABELS } from "@/lib/sales/types";

export function IntentBadge({ level }: { level: IntentLevel }) {
  const variant = level === "high" ? "destructive" : level === "medium" ? "warning" : "secondary";
  return <Badge variant={variant}>{INTENT_LABELS[level]}</Badge>;
}

export function QuoteStageBadge({ stage }: { stage: QuoteStage | string }) {
  const label = QUOTE_STAGE_LABELS[stage] ?? stage;
  const variant =
    stage === "won"
      ? "success"
      : stage === "lost"
        ? "destructive"
        : stage === "quoted" || stage === "confirming"
          ? "info"
          : "secondary";
  return <Badge variant={variant}>{label}</Badge>;
}

export function CompletenessBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 min-w-16 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground">{value}%</span>
    </div>
  );
}
