"use client";

import { Skeleton, StatCard } from "@qiyun/ui";

import type { KnowledgeDocument } from "@/lib/knowledge/types";
import { DOCUMENT_STATUS_LABELS } from "@/lib/knowledge/status-labels";
import type { DocumentStatus } from "@/lib/knowledge/types";

function countStatus(documents: KnowledgeDocument[], status: DocumentStatus) {
  return documents.filter((document) => document.status === status).length;
}

export function DocumentPipelineSummary({
  documents,
  loading = false,
}: {
  documents: KnowledgeDocument[];
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-[88px] rounded-card" />
        ))}
      </div>
    );
  }

  if (!documents.length) {
    return null;
  }

  const statuses: DocumentStatus[] = [
    "uploaded",
    "parsing",
    "indexing",
    "ready",
    "failed",
  ];

  return (
    <section
      className="grid grid-cols-2 gap-3 md:grid-cols-5"
      aria-label="文档处理状态汇总"
    >
      {statuses.map((status) => {
        const count = countStatus(documents, status);
        const tone =
          status === "failed"
            ? ("warning" as const)
            : status === "ready"
              ? ("default" as const)
              : count > 0
                ? ("default" as const)
                : ("default" as const);

        return (
          <StatCard
            key={status}
            emphasis="metric"
            label={DOCUMENT_STATUS_LABELS[status]}
            value={String(count)}
            description={
              status === "ready"
                ? "可被机器人引用"
                : status === "failed"
                  ? "可重试索引"
                  : count > 0
                    ? "处理中"
                    : "暂无"
            }
            tone={status === "failed" && count > 0 ? "warning" : tone}
          />
        );
      })}
    </section>
  );
}
