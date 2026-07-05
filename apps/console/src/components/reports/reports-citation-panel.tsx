"use client";

import Link from "next/link";
import { BookOpenText } from "lucide-react";

import { Button } from "@qiyun/ui";

import { KnowledgeCitationList } from "@/components/shared/knowledge-citation-list";
import type { ReportCitationMetric } from "@/lib/reports/types";

export interface ReportsCitationPanelProps {
  citations: ReportCitationMetric[];
}

export function ReportsCitationPanel({ citations }: ReportsCitationPanelProps) {
  return (
    <section className="rounded-card border border-border/80 bg-card p-5 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <BookOpenText className="h-5 w-5 text-primary" aria-hidden />
            <h2 className="text-lg font-semibold text-card-foreground">知识引用排行</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            统计机器人回复中最常被命中的知识库片段；卡片展示标题、摘要与引用次数。
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/knowledge-bases">管理知识库</Link>
        </Button>
      </div>

      <div className="mt-5">
        <KnowledgeCitationList
          citations={citations.map((item) => ({
            id: item.id,
            title: item.botName ? `${item.title} · ${item.botName}` : item.title,
            excerpt: item.excerpt,
            hitCount: item.hitCount,
          }))}
          emptyTitle="暂无引用排行"
          emptyDescription="有会话且机器人命中知识库后，高频引用片段会显示在这里。"
        />
      </div>
    </section>
  );
}
