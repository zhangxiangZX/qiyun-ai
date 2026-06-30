import type { DashboardSnapshot, TrendPoint } from "./types";

function buildTrend(days: number, baseSessions: number, baseLeads: number): TrendPoint[] {
  const points: TrendPoint[] = [];
  const now = new Date();

  for (let index = days - 1; index >= 0; index -= 1) {
    const date = new Date(now);
    date.setDate(now.getDate() - index);
    const wave = Math.sin((days - index) / 2.4) * 0.18 + 1;
    const sessions = Math.round(baseSessions * wave + (index % 3) * 4);
    const leads = Math.max(1, Math.round(baseLeads * wave + (index % 2)));

    points.push({
      date: date.toISOString().slice(0, 10),
      label: `${date.getMonth() + 1}/${date.getDate()}`,
      sessions,
      leads,
    });
  }

  return points;
}

export const dashboardWithBots: DashboardSnapshot = {
  hasBots: true,
  kpis: [
    {
      id: "sessions",
      label: "今日会话",
      value: "186",
      description: "较昨日 +12%，峰值出现在 14:00 到 16:00",
      trend: "+12%",
      trendDirection: "up",
    },
    {
      id: "visitors",
      label: "今日访客",
      value: "94",
      description: "独立访客，包含官网 Widget 和测试页面",
      trend: "+8%",
      trendDirection: "up",
    },
    {
      id: "leads",
      label: "今日线索",
      value: "17",
      description: "留资转化率 9.1%，其中 6 条待跟进",
      trend: "+3",
      trendDirection: "up",
    },
    {
      id: "response",
      label: "平均响应",
      value: "1.8s",
      description: "首 token P95 为 4.2s，检索链路正常",
      trend: "稳定",
      trendDirection: "neutral",
    },
  ],
  trend7: buildTrend(7, 120, 8),
  trend30: buildTrend(30, 110, 7),
  frequentQuestions: [
    { id: "fq-1", question: "如何接入官网嵌入代码？", count: 42, botName: "官网客服" },
    { id: "fq-2", question: "支持哪些文档格式上传？", count: 31, botName: "产品助手" },
    { id: "fq-3", question: "报价和套餐有什么区别？", count: 24, botName: "销售顾问" },
    { id: "fq-4", question: "数据是否支持多工作区隔离？", count: 18, botName: "官网客服" },
    { id: "fq-5", question: "如何把线索导出到 CRM？", count: 12, botName: "销售顾问" },
  ],
  unresolvedQuestions: [
    {
      id: "uq-1",
      question: "能否对接企业微信自动回复？",
      askedAt: "2026-06-29T09:14:00.000Z",
      botName: "官网客服",
    },
    {
      id: "uq-2",
      question: "私有化部署的最低服务器配置是什么？",
      askedAt: "2026-06-29T08:02:00.000Z",
      botName: "产品助手",
    },
    {
      id: "uq-3",
      question: "是否支持粤语语音识别？",
      askedAt: "2026-06-28T21:40:00.000Z",
      botName: "官网客服",
    },
    {
      id: "uq-4",
      question: "历史会话能否批量标注训练？",
      askedAt: "2026-06-28T17:22:00.000Z",
      botName: "产品助手",
    },
  ],
  recentLeads: [
    {
      id: "lead-1",
      name: "张晨",
      contact: "138****2201",
      sourceBot: "官网客服",
      lastQuestion: "想了解企业版报价",
      status: "new",
      createdAt: "2026-06-29T10:05:00.000Z",
    },
    {
      id: "lead-2",
      name: "李薇",
      contact: "lwei@example.com",
      sourceBot: "销售顾问",
      lastQuestion: "能否安排产品演示？",
      status: "following",
      createdAt: "2026-06-29T09:18:00.000Z",
    },
    {
      id: "lead-3",
      name: "匿名访客",
      contact: "--",
      sourceBot: "官网客服",
      lastQuestion: "私有化部署周期多久？",
      status: "new",
      createdAt: "2026-06-28T16:44:00.000Z",
    },
    {
      id: "lead-4",
      name: "王穆",
      contact: "186****8890",
      sourceBot: "产品助手",
      lastQuestion: "API 限流策略是什么？",
      status: "won",
      createdAt: "2026-06-27T11:30:00.000Z",
    },
  ],
};

export const dashboardEmpty: DashboardSnapshot = {
  hasBots: false,
  kpis: [],
  trend7: [],
  trend30: [],
  frequentQuestions: [],
  unresolvedQuestions: [],
  recentLeads: [],
};

export function fetchDashboardSnapshot(): Promise<DashboardSnapshot> {
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(dashboardWithBots), 600);
  });
}
