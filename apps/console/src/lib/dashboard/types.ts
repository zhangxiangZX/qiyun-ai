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
}

export interface RecentLead {
  id: string;
  name: string;
  contact: string;
  sourceBot: string;
  lastQuestion: string;
  status: "new" | "following" | "won" | "invalid";
  createdAt: string;
}

export interface DashboardSnapshot {
  hasBots: boolean;
  kpis: DashboardKpi[];
  trend7: TrendPoint[];
  trend30: TrendPoint[];
  frequentQuestions: InsightItem[];
  unresolvedQuestions: UnresolvedItem[];
  recentLeads: RecentLead[];
}
