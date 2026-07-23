"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, FileText, MessageSquare, RefreshCw, Target, Wallet } from "lucide-react";

import {
  Badge,
  Button,
  PageHeader,
  Skeleton,
  StatCard,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@qiyun/ui";

import {
  ConsolePage,
  ConsolePageSection,
} from "@/components/console/console-page-shell";
import { ConsoleEmptyState } from "@/components/console/console-empty-catalog";
import { ConsoleRequestError, resolveRequestErrorPresentation } from "@/components/console/console-request-error";
import { CompletenessBar, IntentBadge, QuoteStageBadge } from "@/components/sales/sales-badges";
import { getApiErrorMessage } from "@/lib/api/errors";
import {
  fetchChannelAttribution,
  fetchConversionFunnel,
  fetchCustomerRecommendations,
  fetchSalesOverview,
  formatAmount,
  listInquiries,
} from "@/lib/sales/api";
import type {
  ChannelAttributionItem,
  ConversionFunnelStep,
  CustomerRecommendation,
  InquiryListItem,
  SalesOverviewMetrics,
} from "@/lib/sales/types";
import { fetchConsoleMode, isPreviewMode } from "@/lib/api/mode";
import {
  MOCK_CHANNEL_ATTRIBUTION,
  MOCK_CONVERSION_FUNNEL,
  MOCK_SALES_OVERVIEW,
} from "@/lib/sales/analytics-mock-data";
import { MOCK_INQUIRIES } from "@/lib/sales/mock-data";
import { MOCK_RECOMMENDATIONS } from "@/lib/sales/customers-mock-data";
import { useOnWorkspaceChanged } from "@/lib/workspace-events";

export function SalesOverviewPanel() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [overview, setOverview] = useState<SalesOverviewMetrics | null>(null);
  const [funnel, setFunnel] = useState<ConversionFunnelStep[]>([]);
  const [channels, setChannels] = useState<ChannelAttributionItem[]>([]);
  const [highIntent, setHighIntent] = useState<InquiryListItem[]>([]);
  const [recommendations, setRecommendations] = useState<CustomerRecommendation[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const mode = await fetchConsoleMode().catch(() => null);
      const preview = mode ? isPreviewMode(mode) : false;
      if (preview) {
        setOverview(MOCK_SALES_OVERVIEW);
        setFunnel(MOCK_CONVERSION_FUNNEL);
        setChannels(MOCK_CHANNEL_ATTRIBUTION);
        setHighIntent(
          MOCK_INQUIRIES.filter((item) => item.intentLevel === "high" && item.status === "open").slice(0, 5),
        );
        setRecommendations(MOCK_RECOMMENDATIONS);
        setLoading(false);
        return;
      }
      const [nextOverview, nextFunnel, nextChannels, nextHighIntent, nextRecommendations] =
        await Promise.all([
          fetchSalesOverview(),
          fetchConversionFunnel(),
          fetchChannelAttribution(),
          listInquiries({ intent: "high", status: "open", limit: 5 }),
          fetchCustomerRecommendations(),
        ]);
      setOverview(nextOverview);
      setFunnel(nextFunnel);
      setChannels(nextChannels);
      setHighIntent(nextHighIntent);
      setRecommendations(nextRecommendations);
    } catch (nextError) {
      setError(nextError);
      setOverview(null);
      setFunnel([]);
      setChannels([]);
      setHighIntent([]);
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useOnWorkspaceChanged(() => {
    void load();
  });

  const hasData = useMemo(
    () => (overview?.effectiveInquiries ?? 0) > 0 || highIntent.length > 0,
    [highIntent.length, overview?.effectiveInquiries],
  );

  if (loading) {
    return (
      <ConsolePageSection>
        <Skeleton className="h-8 w-48" />
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-24 w-full" />
          ))}
        </div>
      </ConsolePageSection>
    );
  }

  if (error) {
    const presentation = resolveRequestErrorPresentation(error, "无法加载成交看板。");
    return (
      <ConsolePageSection>
        <ConsoleRequestError
          kind={presentation.kind}
          message={presentation.message}
          onRetry={() => void load()}
        />
      </ConsolePageSection>
    );
  }

  if (!hasData) {
    return (
      <ConsolePageSection>
        <ConsoleEmptyState
          preset="noLeads"
          title="尚未接入渠道或暂无有效询盘"
          description="上传知识库、部署 Widget 或配置来源码后，成交数据将在此展示。"
        />
      </ConsolePageSection>
    );
  }

  return (
    <ConsolePageSection className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">成交数据看板</h2>
          <p className="text-sm text-muted-foreground">询盘 → 需求采集 → 报价 → 成交</p>
        </div>
        <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => void load()}>
          <RefreshCw className="h-3.5 w-3.5" aria-hidden />
          刷新
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="有效询盘"
          value={String(overview?.effectiveInquiries ?? 0)}
          icon={<MessageSquare size={22} aria-hidden />}
          iconTone="brand"
        />
        <StatCard
          label="高意向"
          value={String(overview?.highIntentCount ?? 0)}
          icon={<Target size={22} aria-hidden />}
          iconTone="warning"
        />
        <StatCard
          label="待报价"
          value={String(overview?.pendingQuoteCount ?? 0)}
          icon={<FileText size={22} aria-hidden />}
          iconTone="purple"
        />
        <StatCard
          label="已报价"
          value={String(overview?.quotedCount ?? 0)}
          icon={<FileText size={22} aria-hidden />}
          iconTone="info"
        />
        <StatCard
          label="已成交"
          value={String(overview?.wonCount ?? 0)}
          icon={<CheckCircle2 size={22} aria-hidden />}
          iconTone="success"
        />
        <StatCard
          label="成交金额"
          value={formatAmount(overview?.wonAmountTotal)}
          description="仅统计已录入的成交金额"
          icon={<Wallet size={22} aria-hidden />}
          iconTone="brand"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-card border border-border bg-card p-4 shadow-card">
          <h3 className="font-medium">销售转化漏斗</h3>
          <ol className="mt-4 space-y-2">
            {funnel.map((step) => (
              <li key={step.key} className="flex items-center justify-between text-sm">
                <span>{step.label}</span>
                <Badge variant="secondary">{step.count}</Badge>
              </li>
            ))}
          </ol>
        </article>

        <article className="rounded-card border border-border bg-card p-4 shadow-card">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">待处理高意向</h3>
            <Link href="/dashboard/inquiries" className="text-sm text-primary">
              全部
            </Link>
          </div>
          <ul className="mt-4 space-y-3">
            {highIntent.length === 0 ? (
              <li className="text-sm text-muted-foreground">暂无高意向询盘</li>
            ) : (
              highIntent.map((item) => (
                <li key={item.id} className="rounded-lg border border-border p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{item.customerName}</span>
                    <IntentBadge level={item.intentLevel} />
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{item.summary ?? "—"}</p>
                </li>
              ))
            )}
          </ul>
        </article>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-card border border-border bg-card p-4 shadow-card">
          <h3 className="font-medium">渠道成交贡献</h3>
          <ul className="mt-4 space-y-3">
            {channels.length === 0 ? (
              <li className="text-sm text-muted-foreground">暂无渠道归因数据</li>
            ) : (
              channels.map((item) => (
                <li key={`${item.sourceCode ?? "none"}-${item.sourceType}`} className="flex justify-between gap-3 text-sm">
                  <div>
                    <p className="font-medium">{item.sourceLabel}</p>
                    <p className="text-muted-foreground">
                      {item.inquiryCount} 询盘 · {item.quoteCount} 报价 · {item.wonCount} 成交
                    </p>
                  </div>
                  <span className="font-semibold">{formatAmount(item.wonAmountTotal)}</span>
                </li>
              ))
            )}
          </ul>
        </article>

        <article className="rounded-card border border-border bg-card p-4 shadow-card">
          <h3 className="font-medium">AI 行动建议</h3>
          <ul className="mt-4 space-y-3">
            {recommendations.length === 0 ? (
              <li className="text-sm text-muted-foreground">暂无建议</li>
            ) : (
              recommendations.map((item) => (
                <li key={item.id} className="text-sm">
                  <p className="font-medium">{item.title}</p>
                  <p className="text-muted-foreground">{item.detail}</p>
                </li>
              ))
            )}
          </ul>
        </article>
      </div>
    </ConsolePageSection>
  );
}

export function SalesOverviewWorkspace() {
  return (
    <ConsolePage>
      <PageHeader
        title="成交数据看板"
        description="从询盘到成交的经营视角，不展示虚构金额。"
      />
      <SalesOverviewPanel />
      <ConsolePageSection>
        <Link href="/dashboard/inquiries" className="inline-flex items-center gap-1 text-sm text-primary">
          进入询盘中心
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </ConsolePageSection>
    </ConsolePage>
  );
}
