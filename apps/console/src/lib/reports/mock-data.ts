import { dashboardWithBots } from "@/lib/dashboard/mock-data";
import type { ReportSnapshot } from "./types";

function sumTrendField(points: typeof dashboardWithBots.trend7, field: "sessions" | "leads"): number {
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
  unresolvedQuestions: [
    {
      id: "uq-1",
      question: "能否对接企业微信自动回复？",
      askedAt: "2026-06-29T09:14:00.000Z",
      botName: "官网客服",
      citedSource: "集成说明 / 渠道能力",
    },
    {
      id: "uq-2",
      question: "私有化部署的最低服务器配置是什么？",
      askedAt: "2026-06-29T08:02:00.000Z",
      botName: "产品助手",
      citedSource: "部署指南 / 环境要求",
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
  topCitations: [
    {
      id: "rc-1",
      title: "产品支持文档 / 套餐说明",
      excerpt: "企业版支持私有化部署，可按项目评估交付周期。",
      hitCount: 46,
      botName: "官网客服",
    },
    {
      id: "rc-2",
      title: "部署指南 / 环境要求",
      excerpt: "推荐 4 核 8 GB 起步，生产环境需独立 PostgreSQL 与对象存储。",
      hitCount: 28,
      botName: "产品助手",
    },
    {
      id: "rc-3",
      title: "Widget 嵌入说明",
      excerpt: "复制 script 标签到官网模板，并通过 site key 完成鉴权。",
      hitCount: 21,
      botName: "官网客服",
    },
  ],
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
  topCitations: [],
};

export function fetchReportSnapshot(): Promise<ReportSnapshot> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(reportWithBots), 600);
  });
}
