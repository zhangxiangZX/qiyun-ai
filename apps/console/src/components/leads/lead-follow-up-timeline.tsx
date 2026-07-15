"use client";

import { Timeline } from "@qiyun/ui";

import { formatShortDateTime } from "@/lib/leads/format";
import type { LeadFollowUpRecord } from "@/lib/leads/types";

function mapRecordMeta(record: LeadFollowUpRecord): {
  badge: string;
  tone: "default" | "success" | "warning" | "muted" | "info";
} {
  switch (record.kind) {
    case "system":
      return { badge: "系统事件", tone: "muted" };
    case "status":
      return { badge: "状态变更", tone: "warning" };
    case "assignee":
      return { badge: "负责人", tone: "info" };
    case "note":
    default:
      return { badge: "人工跟进", tone: "success" };
  }
}

export interface LeadFollowUpTimelineProps {
  records: LeadFollowUpRecord[];
  loading?: boolean;
  errorMessage?: string | null;
  highlightSave?: boolean;
  onRetry?: () => void;
}

export function LeadFollowUpTimeline({
  records,
  loading = false,
  errorMessage = null,
  highlightSave = false,
  onRetry,
}: LeadFollowUpTimelineProps) {
  return (
    <section className="space-y-3 rounded-card border border-border bg-card p-4 text-sm shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          跟进记录
        </h3>
        {highlightSave ? (
          <span className="rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-medium text-success">
            已写入最新跟进
          </span>
        ) : null}
      </div>
      <Timeline
        loading={loading}
        errorMessage={errorMessage}
        onRetry={onRetry}
        items={records.map((record, index) => {
          const meta = mapRecordMeta(record);
          return {
            id: record.id,
            title: record.title,
            description: record.body,
            meta: `${formatShortDateTime(record.createdAt)}${record.actor ? ` · ${record.actor}` : ""}`,
            badge: meta.badge,
            tone: index === 0 ? meta.tone : record.kind === "system" ? "muted" : meta.tone,
          };
        })}
        emptyTitle="暂无跟进记录"
        emptyDescription="保存状态、负责人或备注后，系统事件与人工跟进会按时间顺序显示在这里。"
      />
    </section>
  );
}
