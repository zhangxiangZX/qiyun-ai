"use client";

import type { DashboardSnapshot } from "@/lib/dashboard/types";
import type { ReportSnapshot } from "@/lib/reports/types";

export function hasDashboardActivity(snapshot: DashboardSnapshot): boolean {
  if (!snapshot.hasBots) return false;
  const hasKpi = snapshot.kpis.some((item) => {
    const numeric = Number.parseInt(item.value.replace(/[^\d]/g, ""), 10);
    return Number.isFinite(numeric) && numeric > 0;
  });
  const hasTrend = [...snapshot.trend7, ...snapshot.trend30].some(
    (point) => point.sessions > 0 || point.leads > 0,
  );
  return hasKpi || hasTrend || snapshot.recentLeads.length > 0;
}

export function hasReportActivity(snapshot: ReportSnapshot): boolean {
  if (!snapshot.hasBots) return false;
  const { period } = snapshot;
  return (
    period.sessions7d > 0 ||
    period.sessions30d > 0 ||
    period.leads7d > 0 ||
    period.leads30d > 0 ||
    snapshot.topCitations.length > 0 ||
    snapshot.botMetrics.length > 0
  );
}
