export type TrendRange = 7 | 30;

export interface DashboardKpi {
  id: string;
  label: string;
  value: string;
  description: string;
  trend: string;
  trendDirection: "up" | "down" | "neutral";
}

export interface TrendPoint {
  date: string;
  label: string;
  sessions: number;
  leads: number;
}

export interface InsightItem {
  id: string;
  question: string;
  count: number;
  botName?: string;
}

export interface UnresolvedItem {
  id: string;
  question: string;
  askedAt: string;
  botName: string;
  citedSource?: string;
}

export interface RecentLead {
  id: string;
  name: string;
  contact: string;
  sourceBot: string;
  lastQuestion: string;
  status: "new" | "pending" | "contacted" | "proposal" | "won" | "invalid";
  createdAt: string;
}

/** 渠道来源会话数；来自 Dashboard API，缺失时概览页展示空态。 */
export interface ChannelDistributionItem {
  label: string;
  sessions: number;
}

export interface DashboardSnapshot {
  hasBots: boolean;
  kpis: DashboardKpi[];
  trend7: TrendPoint[];
  trend30: TrendPoint[];
  frequentQuestions: InsightItem[];
  unresolvedQuestions: UnresolvedItem[];
  recentLeads: RecentLead[];
  channelDistribution?: ChannelDistributionItem[];
}
