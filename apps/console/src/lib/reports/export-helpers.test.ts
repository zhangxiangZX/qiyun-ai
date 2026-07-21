import assert from "node:assert/strict";
import test from "node:test";

import {
  buildChannelsCsv,
  buildInquiriesCsv,
  buildReportCsv,
  buildSalesOverviewCsv,
} from "@/lib/reports/export-helpers";
import type {
  ChannelAttributionItem,
  ConversionFunnelStep,
  InquiryListItem,
  SalesOverviewMetrics,
} from "@/lib/sales/types";

const overview: SalesOverviewMetrics = {
  effectiveInquiries: 12,
  highIntentCount: 5,
  pendingQuoteCount: 3,
  quotedCount: 2,
  wonCount: 1,
  estimatedAmountTotal: 100000,
  wonAmountTotal: 50000,
};

const funnel: ConversionFunnelStep[] = [
  { key: "inquiries", label: "询盘", count: 12 },
  { key: "won", label: "成交", count: 1 },
];

const inquiries: InquiryListItem[] = [
  {
    id: "inq_1",
    conversationId: "c1",
    leadId: null,
    botId: "bot_1",
    botName: "助手",
    customerName: "华东张工",
    customerContact: null,
    sourceCode: null,
    sourceType: "website",
    intentLevel: "high",
    requirementCompleteness: 0.8,
    summary: "冷水机报价",
    missingFields: [],
    needsEngineer: false,
    ownerId: "sales_lina",
    nextActionAt: null,
    quoteStatus: "to_quote",
    status: "open",
    updatedAt: "2026-07-20T00:00:00.000Z",
    createdAt: "2026-07-20T00:00:00.000Z",
  },
];

const channels: ChannelAttributionItem[] = [
  {
    sourceCode: "site_1",
    sourceLabel: "官网 Widget",
    sourceType: "website",
    inquiryCount: 8,
    quoteCount: 2,
    wonCount: 1,
    wonAmountTotal: 50000,
  },
];

test("sales csv includes overview metrics and funnel rows", () => {
  const csv = buildSalesOverviewCsv(overview, funnel, "2026-06-22 ~ 2026-07-21");
  assert.match(csv, /有效询盘,12/);
  assert.match(csv, /成交数,1/);
  assert.match(csv, /询盘,12/);
});

test("inquiry csv includes data rows", () => {
  const csv = buildInquiriesCsv(inquiries, "2026-06-22 ~ 2026-07-21");
  assert.match(csv, /华东张工/);
  assert.match(csv, /高意向/);
  assert.match(csv, /记录数,1/);
});

test("channel csv includes attribution rows", () => {
  const csv = buildChannelsCsv(channels, "2026-06-22 ~ 2026-07-21");
  assert.match(csv, /官网 Widget/);
  assert.match(csv, /询盘数/);
  assert.match(csv, /8/);
});

test("buildReportCsv switches by type", () => {
  const sales = buildReportCsv({
    type: "sales",
    overview,
    funnel,
    inquiries,
    channels,
    rangeLabel: "30d",
  });
  const inquiry = buildReportCsv({
    type: "inquiries",
    overview,
    funnel,
    inquiries,
    channels,
    rangeLabel: "30d",
  });
  assert.match(sales, /销售业绩报表/);
  assert.match(inquiry, /询盘报表/);
  assert.match(inquiry, /华东张工/);
});
