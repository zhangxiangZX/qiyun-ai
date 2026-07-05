"use client";

import Link from "next/link";
import { AlertCircle, MessageCircleQuestion } from "lucide-react";

import { Badge, Button } from "@qiyun/ui";

import { ConsoleEmptyState } from "@/components/console/console-empty-catalog";

import { formatRelativeTime } from "@/lib/dashboard/format";
import type { InsightItem, UnresolvedItem } from "@/lib/dashboard/types";

export interface DashboardInsightPanelsProps {
  frequentQuestions: InsightItem[];
  unresolvedQuestions: UnresolvedItem[];
}

export function DashboardInsightPanels({
  frequentQuestions,
  unresolvedQuestions,
}: DashboardInsightPanelsProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="console-panel">
        <div className="flex items-center gap-2">
          <MessageCircleQuestion className="h-5 w-5 text-primary" aria-hidden />
          <h2 className="text-lg font-semibold text-card-foreground">高频问题</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">按提问次数排序，方便补充知识库。</p>

        {frequentQuestions.length ? (
          <ol className="mt-5 space-y-3">
            {frequentQuestions.map((item, index) => (
              <li
                key={item.id}
                className="flex items-start justify-between gap-3 rounded-control border border-border/70 bg-background/60 p-4"
              >
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground">#{index + 1}</p>
                  <p className="mt-1 text-sm font-medium text-card-foreground">{item.question}</p>
                  {item.botName ? (
                    <p className="mt-1 text-xs text-muted-foreground">{item.botName}</p>
                  ) : null}
                </div>
                <Badge variant="secondary">{item.count} 次</Badge>
              </li>
            ))}
          </ol>
        ) : (
          <div className="mt-5">
            <ConsoleEmptyState preset="noFrequentQuestions" />
          </div>
        )}
      </section>

      <section className="console-panel">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-warning" aria-hidden />
          <h2 className="text-lg font-semibold text-card-foreground">未解决问题</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">知识库未命中或需要人工跟进的问题。</p>

        {unresolvedQuestions.length ? (
          <ul className="mt-5 space-y-3">
            {unresolvedQuestions.map((item) => (
              <li
                key={item.id}
                className="rounded-control border border-border/70 bg-background/60 p-4"
              >
                <p className="text-sm font-medium text-card-foreground">{item.question}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>{item.botName}</span>
                  <span aria-hidden>·</span>
                  <span>{formatRelativeTime(item.askedAt)}</span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-5">
            <ConsoleEmptyState preset="noUnresolvedQuestions" />
          </div>
        )}

        {unresolvedQuestions.length ? (
          <div className="mt-4">
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/conversations">查看相关会话</Link>
            </Button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
