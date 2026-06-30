"use client";

import { Download } from "lucide-react";

import { Badge, Button, EmptyState } from "@qiyun/ui";

import { formatRelativeTime } from "@/lib/dashboard/format";
import type { InsightItem, UnresolvedItem } from "@/lib/dashboard/types";

export interface ReportsQuestionTablesProps {
  frequentQuestions: InsightItem[];
  unresolvedQuestions: UnresolvedItem[];
}

export function ReportsQuestionTables({
  frequentQuestions,
  unresolvedQuestions,
}: ReportsQuestionTablesProps) {
  function handleExport() {
    window.alert("导出功能将在接入分析 API（E-06）后开放。");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-card-foreground">问题分析</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            汇总高频提问与未解决问题，用于补充知识库与运营复盘。
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="h-4 w-4" aria-hidden />
          导出 CSV
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-card border border-border/80 bg-card p-5 shadow-card">
          <h3 className="text-sm font-semibold text-card-foreground">高频问题 TOP 5</h3>
          {frequentQuestions.length ? (
            <ol className="mt-4 space-y-2">
              {frequentQuestions.map((item, index) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-control border border-border/70 px-3 py-2 text-sm"
                >
                  <span className="min-w-0 truncate">
                    <span className="text-muted-foreground">#{index + 1}</span> {item.question}
                  </span>
                  <Badge variant="secondary">{item.count}</Badge>
                </li>
              ))}
            </ol>
          ) : (
            <div className="mt-4">
              <EmptyState title="暂无数据" description="有会话后将生成高频问题排行。" />
            </div>
          )}
        </section>

        <section className="rounded-card border border-border/80 bg-card p-5 shadow-card">
          <h3 className="text-sm font-semibold text-card-foreground">未解决问题清单</h3>
          {unresolvedQuestions.length ? (
            <ul className="mt-4 space-y-2">
              {unresolvedQuestions.map((item) => (
                <li
                  key={item.id}
                  className="rounded-control border border-border/70 px-3 py-2 text-sm"
                >
                  <p className="font-medium text-card-foreground">{item.question}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.botName} · {formatRelativeTime(item.askedAt)}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-4">
              <EmptyState title="暂无未解决问题" description="机器人回答稳定时这里会保持为空。" />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
