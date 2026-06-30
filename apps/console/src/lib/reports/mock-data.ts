import { dashboardWithBots } from "@/lib/dashboard/mock-data";
import type { ReportSnapshot } from "./types";

function sumTrendField(
  points: typeof dashboardWithBots.trend7,
  field: "sessions" | "leads",
): number {
  return points.reduce((sum, point) => sum + point[field], 0);
}

export const reportWithBots: ReportSnapshot = {
  hasBots: true,
  period: {
    sessions7d: sumTrendField(dashboardWithBots.trend7, "sessions"),
    sessions30d: sumTrendField(dashboardWithBots.trend30, "sessions"),
    leads7d: sumTrendField(dashboardWithBots.trend7, "leads"),
    leads30d: sumTrendField(dashboardWithBots.trend30, "leads"),
    unresolvedRate: "12.4%",
  },
  trend7: dashboardWithBots.trend7,
  trend30: dashboardWithBots.trend30,
  botMetrics: [
    {
      id: "bot-support",
      botName: "官网客服",
      sessions7d: 428,
      leads7d: 52,
      leadRate: "12.1%",
      avgResponse: "1.6s",
      unresolvedCount: 8,
    },
    {
      id: "bot-sales",
      botName: "销售顾问",
      sessions7d: 156,
      leads7d: 34,
      leadRate: "21.8%",
      avgResponse: "2.1s",
      unresolvedCount: 3,
    },
    {
      id: "bot-internal",
      botName: "内部知识助手",
      sessions7d: 89,
      leads7d: 0,
      leadRate: "—",
      avgResponse: "1.4s",
      unresolvedCount: 1,
    },
  ],
  frequentQuestions: dashboardWithBots.frequentQuestions,
  unresolvedQuestions: dashboardWithBots.unresolvedQuestions,
};

export const reportEmpty: ReportSnapshot = {
  hasBots: false,
  period: {
    sessions7d: 0,
    sessions30d: 0,
    leads7d: 0,
    leads30d: 0,
    unresolvedRate: "—",
  },
  trend7: [],
  trend30: [],
  botMetrics: [],
  frequentQuestions: [],
  unresolvedQuestions: [],
};

export function fetchReportSnapshotMock(): Promise<ReportSnapshot> {
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(reportWithBots), 600);
  });
}
