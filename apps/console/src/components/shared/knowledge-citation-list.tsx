"use client";

import { FileText } from "lucide-react";

import { Badge, Skeleton } from "@qiyun/ui";

import { ConsoleEmptyState } from "@/components/console/console-empty-catalog";
import { ConsoleRequestError } from "@/components/console/console-request-error";

export interface KnowledgeCitationItem {
  id: string;
  title: string;
  excerpt: string;
  score?: number;
  hitCount?: number;
  documentName?: string;
}

export function parseCitationDocumentName(title: string): string {
  const parts = title.split(" / ");
  return parts.length > 1 ? parts[0].trim() : title;
}

export function formatCitationScore(score: number): string {
  return `${Math.round(score * 100)}%`;
}

export function getCitationScoreVariant(
  score: number,
): "success" | "secondary" | "warning" | "outline" {
  if (score >= 0.8) return "success";
  if (score >= 0.6) return "secondary";
  return "warning";
}

export function getCitationStrengthLabel(score: number): string {
  if (score >= 0.8) return "高相关";
  if (score >= 0.6) return "中相关";
  return "低相关";
}

export function KnowledgeCitationCard({
  citation,
  compact = false,
}: {
  citation: KnowledgeCitationItem;
  compact?: boolean;
}) {
  const documentName = citation.documentName ?? parseCitationDocumentName(citation.title);
  const sectionTitle =
    citation.documentName && citation.title !== citation.documentName
      ? citation.title
      : citation.title.includes(" / ")
        ? citation.title.split(" / ").slice(1).join(" / ")
        : null;

  return (
    <article
      className={[
        "rounded-control border border-border/70 bg-background/60",
        compact ? "p-2.5" : "p-3",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden />
            知识片段
          </p>
          <p className="mt-1 truncate text-sm font-semibold text-foreground">{documentName}</p>
          {sectionTitle ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{sectionTitle}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {typeof citation.score === "number" ? (
            <>
              <Badge variant={getCitationScoreVariant(citation.score)}>
                可信度 {formatCitationScore(citation.score)}
              </Badge>
              <span className="text-[10px] text-muted-foreground">
                {getCitationStrengthLabel(citation.score)}
              </span>
            </>
          ) : null}
          {typeof citation.hitCount === "number" ? (
            <Badge variant="outline">{citation.hitCount} 次引用</Badge>
          ) : null}
        </div>
      </div>
      <p
        className={[
          "mt-2 leading-relaxed text-muted-foreground",
          compact ? "text-xs line-clamp-3" : "text-sm line-clamp-4",
        ].join(" ")}
      >
        {citation.excerpt}
      </p>
    </article>
  );
}

export function KnowledgeCitationList({
  citations,
  emptyTitle = "暂无知识引用",
  emptyDescription = "当机器人命中知识库内容时，会在这里展示引用来源。",
  compact = false,
  loading = false,
  errorMessage = null,
  onRetry,
}: {
  citations: KnowledgeCitationItem[];
  emptyTitle?: string;
  emptyDescription?: string;
  compact?: boolean;
  loading?: boolean;
  errorMessage?: string | null;
  onRetry?: () => void;
}) {
  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-[88px] rounded-control" />
        <Skeleton className="h-[88px] rounded-control" />
      </div>
    );
  }

  if (errorMessage) {
    return (
      <ConsoleRequestError
        message={errorMessage}
        onRetry={onRetry}
        retryLabel="重新加载"
      />
    );
  }

  if (!citations.length) {
    return (
      <ConsoleEmptyState
        preset="noCitations"
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  }

  return (
    <ul className={compact ? "space-y-2" : "space-y-3"}>
      {citations.map((citation) => (
        <li key={citation.id}>
          <KnowledgeCitationCard citation={citation} compact={compact} />
        </li>
      ))}
    </ul>
  );
}

export function aggregateMessageCitations(
  messages: Array<{
    citations?: Array<{ id: string; title: string; excerpt: string; score?: number }>;
  }>,
): KnowledgeCitationItem[] {
  const grouped = new Map<string, KnowledgeCitationItem>();

  for (const message of messages) {
    for (const citation of message.citations ?? []) {
      const existing = grouped.get(citation.title);
      if (existing) {
        existing.hitCount = (existing.hitCount ?? 1) + 1;
        if (typeof citation.score === "number") {
          existing.score = Math.max(existing.score ?? 0, citation.score);
        }
        continue;
      }

      grouped.set(citation.title, {
        id: citation.id,
        title: citation.title,
        excerpt: citation.excerpt,
        score: citation.score,
        documentName: parseCitationDocumentName(citation.title),
        hitCount: 1,
      });
    }
  }

  return Array.from(grouped.values()).sort((left, right) => {
    const scoreDiff = (right.score ?? 0) - (left.score ?? 0);
    if (scoreDiff !== 0) return scoreDiff;
    return (right.hitCount ?? 0) - (left.hitCount ?? 0);
  });
}

export function mapStreamCitation(item: {
  title: string;
  snippet: string;
  score?: number;
  chunkId?: string;
}): KnowledgeCitationItem {
  return {
    id: item.chunkId ?? item.title,
    title: item.title,
    excerpt: item.snippet,
    score: item.score,
    documentName: parseCitationDocumentName(item.title),
  };
}
