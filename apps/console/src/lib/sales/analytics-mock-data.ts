import type {
  ChannelAttributionItem,
  ConversionFunnelStep,
  SalesOverviewMetrics,
} from "@/lib/sales/types";

/**
 * Preview 模式回退：成交看板 / 转化漏斗 / 渠道归因的示例数据。
 * 数值与 customers-mock-data、mock-data 的示例询盘/报价保持一致口径，
 * 仅用于质量走查，不展示虚构经营结论。
 */
export const MOCK_SALES_OVERVIEW: SalesOverviewMetrics = {
  effectiveInquiries: 4,
  highIntentCount: 2,
  pendingQuoteCount: 1,
  quotedCount: 2,
  wonCount: 2,
  estimatedAmountTotal: 750000,
  wonAmountTotal: 460000,
};

export const MOCK_CONVERSION_FUNNEL: ConversionFunnelStep[] = [
  { key: "conversations", label: "新询盘", count: 12 },
  { key: "effective_inquiries", label: "有效询盘", count: 8 },
  { key: "quoting", label: "报价中", count: 3 },
  { key: "quoted", label: "已报价", count: 2 },
  { key: "won", label: "已成交", count: 2 },
];

export const MOCK_CHANNEL_ATTRIBUTION: ChannelAttributionItem[] = [
  {
    sourceCode: "google-ads",
    sourceLabel: "官网Widget",
    sourceType: "website",
    inquiryCount: 6,
    quoteCount: 3,
    wonCount: 1,
    wonAmountTotal: 335000,
  },
  {
    sourceCode: "expo-2026",
    sourceLabel: "展会活动",
    sourceType: "expo",
    inquiryCount: 4,
    quoteCount: 2,
    wonCount: 1,
    wonAmountTotal: 125000,
  },
  {
    sourceCode: "wechat-official",
    sourceLabel: "微信渠道",
    sourceType: "wechat",
    inquiryCount: 2,
    quoteCount: 1,
    wonCount: 0,
    wonAmountTotal: null,
  },
];
