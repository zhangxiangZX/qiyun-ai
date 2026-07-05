import type { InsightItem, TrendPoint, UnresolvedItem } from "@/lib/dashboard/types";

export interface ReportPeriodSummary {
  sessions7d: number;
  sessions30d: number;
  leads7d: number;
  leads30d: number;
  unresolvedRate: string;
}

export interface ReportBotMetric {
  id: string;
  botName: string;
  sessions7d: number;
  leads7d: number;
  leadRate: string;
  avgResponse: string;
  unresolvedCount: number;
}

export interface ReportCitationMetric {
  id: string;
  title: string;
  excerpt: string;
  hitCount: number;
  botName?: string;
}

export interface ReportSnapshot {
  hasBots: boolean;
  period: ReportPeriodSummary;
  trend7: TrendPoint[];
  trend30: TrendPoint[];
  botMetrics: ReportBotMetric[];
  frequentQuestions: InsightItem[];
  unresolvedQuestions: UnresolvedItem[];
  topCitations: ReportCitationMetric[];
}
