"use client";

import { useState } from "react";
import { Download } from "lucide-react";

import { Badge, Button, ConfirmDialog } from "@qiyun/ui";

import { ConsoleEmptyState } from "@/components/console/console-empty-catalog";
import { ConsoleFeedback } from "@/components/console/console-feedback";

import { formatRelativeTime } from "@/lib/dashboard/format";
import type { InsightItem, UnresolvedItem } from "@/lib/dashboard/types";

export interface ReportsQuestionTablesProps {
  frequentQuestions: InsightItem[];
  unresolvedQuestions: UnresolvedItem[];
}

function escapeCsvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function downloadQuestionsCsv(
  frequentQuestions: InsightItem[],
  unresolvedQuestions: UnresolvedItem[],
): void {
  const rows = [
    ["类型", "问题", "次数或来源", "机器人", "时间"],
    ...frequentQuestions.map((item) => [
      "高频",
      item.question,
      String(item.count),
      item.botName ?? "",
      "",
    ]),
    ...unresolvedQuestions.map((item) => [
      "未解决",
      item.question,
      item.citedSource ?? "",
      item.botName ?? "",
      item.askedAt,
    ]),
  ];

  const csv = `\uFEFF${rows.map((row) => row.map(escapeCsvCell).join(",")).join("\n")}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `qiyun-reports-questions-${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function ReportsQuestionTables({
  frequentQuestions,
  unresolvedQuestions,
}: ReportsQuestionTablesProps) {
  const [exportOpen, setExportOpen] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const hasExportData = frequentQuestions.length > 0 || unresolvedQuestions.length > 0;

  function handleExportConfirmed() {
    setExportOpen(false);

    if (!hasExportData) {
      setExportNotice("当前没有可导出的分析问题数据。");
      return;
    }

    downloadQuestionsCsv(frequentQuestions, unresolvedQuestions);
    setExportNotice("已导出当前页面展示的问题分析 CSV。");
  }

  return (
    <div className="space-y-4">
      {exportNotice ? (
        <ConsoleFeedback
          variant="success"
          title="导出完成"
          message={exportNotice}
          onDismiss={() => setExportNotice(null)}
        />
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-card-foreground">问题分析</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            汇总高频提问与未解决问题，并标注可能相关的知识来源。
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setExportOpen(true)}
          disabled={!hasExportData}
        >
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
                  className="rounded-control border border-border/70 px-3 py-2 text-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="min-w-0 truncate">
                      <span className="text-muted-foreground">#{index + 1}</span> {item.question}
                    </span>
                    <Badge variant="secondary">{item.count}</Badge>
                  </div>
                  {item.botName ? (
                    <p className="mt-1 text-xs text-muted-foreground">{item.botName}</p>
                  ) : null}
                </li>
              ))}
            </ol>
          ) : (
            <div className="mt-4">
              <ConsoleEmptyState preset="noFrequentQuestions" />
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
                  {item.citedSource ? (
                    <p className="mt-2 text-xs text-foreground">
                      最近引用：<span className="text-muted-foreground">{item.citedSource}</span>
                    </p>
                  ) : (
                    <p className="mt-2 text-xs text-warning">未命中知识库，建议补充相关文档。</p>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-4">
              <ConsoleEmptyState preset="noUnresolvedQuestions" />
            </div>
          )}
        </section>
      </div>

      <ConfirmDialog
        open={exportOpen}
        title="确认导出报表"
        description="将导出当前页面展示的高频问题与未解决问题清单为 CSV 文件。"
        confirmLabel="导出"
        cancelLabel="取消"
        onCancel={() => setExportOpen(false)}
        onConfirm={handleExportConfirmed}
      />
    </div>
  );
}
