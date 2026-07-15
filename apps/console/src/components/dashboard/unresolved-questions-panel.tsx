"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";

import { Button, cn } from "@qiyun/ui";

import { ConsoleEmptyState } from "@/components/console/console-empty-catalog";
import { ConsoleRequestError } from "@/components/console/console-request-error";
import { formatRelativeTime } from "@/lib/dashboard/format";
import type { UnresolvedItem } from "@/lib/dashboard/types";

type TimeFilter = "all" | "7d" | "30d";

export interface UnresolvedQuestionsPanelProps {
  items: UnresolvedItem[];
  botOptions: string[];
  loading?: boolean;
  errorMessage?: string | null;
  previewHint?: string | null;
  onRetry?: () => void;
  className?: string;
}

export function UnresolvedQuestionsPanel({
  items,
  botOptions,
  loading = false,
  errorMessage = null,
  previewHint = null,
  onRetry,
  className,
}: UnresolvedQuestionsPanelProps) {
  const [botFilter, setBotFilter] = useState("全部机器人");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");

  const filteredItems = useMemo(() => {
    const now = Date.now();
    return items.filter((item) => {
      if (botFilter !== "全部机器人" && item.botName !== botFilter) {
        return false;
      }
      if (timeFilter === "all") return true;
      const days = timeFilter === "7d" ? 7 : 30;
      const cutoff = now - days * 24 * 60 * 60 * 1000;
      return new Date(item.askedAt).getTime() >= cutoff;
    });
  }, [botFilter, items, timeFilter]);

  return (
    <section className={cn("rounded-card border border-border bg-card p-4 shadow-card sm:p-6", className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-warning" aria-hidden />
            <h2 className="text-lg font-semibold text-card-foreground">未解决问题</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            知识库未命中或需人工跟进的问题，优先补资料或转销售。
          </p>
          {previewHint ? <p className="mt-2 text-xs text-muted-foreground">{previewHint}</p> : null}
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/reports">查看报表 ›</Link>
        </Button>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <select
          className="flex h-10 w-full rounded-control border border-input bg-background px-3 text-sm sm:max-w-[180px]"
          value={botFilter}
          onChange={(event) => setBotFilter(event.target.value)}
        >
          <option value="全部机器人">全部机器人</option>
          {botOptions.map((bot) => (
            <option key={bot} value={bot}>
              {bot}
            </option>
          ))}
        </select>
        <select
          className="flex h-10 w-full rounded-control border border-input bg-background px-3 text-sm sm:max-w-[160px]"
          value={timeFilter}
          onChange={(event) => setTimeFilter(event.target.value as TimeFilter)}
        >
          <option value="all">全部时间</option>
          <option value="7d">近 7 天</option>
          <option value="30d">近 30 天</option>
        </select>
      </div>

      <div className="mt-5">
        {loading ? (
          <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            加载未解决问题…
          </div>
        ) : errorMessage ? (
          <ConsoleRequestError message={errorMessage} onRetry={onRetry} />
        ) : filteredItems.length === 0 ? (
          <ConsoleEmptyState preset="noUnresolvedQuestions" />
        ) : (
          <ul className="space-y-3">
            {filteredItems.map((item) => (
              <li
                key={item.id}
                className="rounded-control border border-border/70 bg-background/60 p-4"
              >
                <p className="text-sm font-medium text-card-foreground">{item.question}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>{item.botName}</span>
                  <span aria-hidden>·</span>
                  <span>{formatRelativeTime(item.askedAt)}</span>
                  {item.citedSource ? (
                    <>
                      <span aria-hidden>·</span>
                      <span>来源：{item.citedSource}</span>
                    </>
                  ) : null}
                </div>
                <div className="mt-3">
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/dashboard/conversations">查看相关会话</Link>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}