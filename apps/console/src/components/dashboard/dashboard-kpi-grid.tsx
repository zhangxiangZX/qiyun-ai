"use client";

import { StatCard } from "@qiyun/ui";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

import type { DashboardKpi } from "@/lib/dashboard/types";

export interface DashboardKpiGridProps {
  items: DashboardKpi[];
}

function TrendBadge({ item }: { item: DashboardKpi }) {
  if (item.trendDirection === "up") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-1 text-xs font-medium text-success">
        <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
        {item.trend}
      </span>
    );
  }

  if (item.trendDirection === "down") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-1 text-xs font-medium text-destructive">
        <ArrowDownRight className="h-3.5 w-3.5" aria-hidden />
        {item.trend}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
      <Minus className="h-3.5 w-3.5" aria-hidden />
      {item.trend}
    </span>
  );
}

export function DashboardKpiGrid({ items }: DashboardKpiGridProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <StatCard
          key={item.id}
          label={item.label}
          value={item.value}
          description={item.description}
          trend={<TrendBadge item={item} />}
        />
      ))}
    </div>
  );
}
