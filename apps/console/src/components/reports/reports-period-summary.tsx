"use client";

import { StatCard } from "@qiyun/ui";

import type { ReportPeriodSummary } from "@/lib/reports/types";

export interface ReportsPeriodSummaryProps {
  period: ReportPeriodSummary;
}

export function ReportsPeriodSummary({ period }: ReportsPeriodSummaryProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label="近 7 日会话"
        value={String(period.sessions7d)}
        description="全渠道会话总量"
      />
      <StatCard
        label="近 30 日会话"
        value={String(period.sessions30d)}
        description="用于观察月度走势"
      />
      <StatCard
        label="近 7 日线索"
        value={String(period.leads7d)}
        description={`近 30 日共 ${period.leads30d} 条`}
      />
      <StatCard
        label="未解决占比"
        value={period.unresolvedRate}
        description="知识库未命中或需人工跟进"
      />
    </div>
  );
}
