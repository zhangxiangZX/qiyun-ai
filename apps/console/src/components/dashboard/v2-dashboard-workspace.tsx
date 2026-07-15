"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Clock3,
  FileText,
  MessageSquare,
  RefreshCw,
  Users,
  Wallet,
} from "lucide-react";

import { Skeleton } from "@qiyun/ui";

import { ConsolePage } from "@/components/console/console-page-shell";
import { ConsoleEmptyState } from "@/components/console/console-empty-catalog";
import { ConsoleRequestError, resolveRequestErrorPresentation } from "@/components/console/console-request-error";
import { DashboardEmptyAction } from "@/components/dashboard/empty-action";
import { V2PageHeader } from "@/components/v2/v2-page-header";
import { V2IntentTag } from "@/components/v2/v2-tags";
import {
  fetchChannelAttribution,
  fetchConversionFunnel,
  fetchSalesOverview,
  formatAmount,
  listInquiries,
} from "@/lib/sales/api";
import type {
  ChannelAttributionItem,
  ConversionFunnelStep,
  InquiryListItem,
  SalesOverviewMetrics,
  SourceType,
} from "@/lib/sales/types";
import { useOnWorkspaceChanged } from "@/lib/workspace-events";

const SOURCE_LABELS: Record<SourceType, string> = {
  website: "官网",
  sales_link: "销售链接",
  douyin: "抖音",
  expo: "展会二维码",
  wechat: "微信",
  other: "其他",
};

const CHANNEL_COLORS = ["#4563f7", "#4ac986", "#ffad2e", "#a5b3cc", "#e2e8f0"];

function formatInquiryTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${month}-${day} ${hours}:${minutes}`;
}

function rateLabel(numerator: number, denominator: number): string {
  if (denominator <= 0) return "—";
  return `${((numerator / denominator) * 100).toFixed(1)}%`;
}

function stepCount(steps: ConversionFunnelStep[], key: string): number {
  return steps.find((step) => step.key === key)?.count ?? 0;
}

function ChannelDonut({ channels }: { channels: ChannelAttributionItem[] }) {
  const total = channels.reduce((sum, item) => sum + item.inquiryCount, 0);
  const top = [...channels]
    .sort((left, right) => right.inquiryCount - left.inquiryCount)
    .slice(0, 5);

  if (total === 0) {
    return <p className="muted text-sm">暂无渠道数据</p>;
  }

  return (
    <div className="donut-wrap">
      <div className="donut" />
      <ul className="legend">
        {top.map((item, index) => (
          <li key={`${item.sourceCode ?? "none"}-${item.sourceType}`}>
            <span style={{ background: CHANNEL_COLORS[index % CHANNEL_COLORS.length] }} />
            {item.sourceLabel}{" "}
            <b>{((item.inquiryCount / total) * 100).toFixed(1)}%</b>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function V2DashboardWorkspace() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [overview, setOverview] = useState<SalesOverviewMetrics | null>(null);
  const [funnel, setFunnel] = useState<ConversionFunnelStep[]>([]);
  const [channels, setChannels] = useState<ChannelAttributionItem[]>([]);
  const [recentInquiries, setRecentInquiries] = useState<InquiryListItem[]>([]);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const [nextOverview, nextFunnel, nextChannels, nextInquiries] = await Promise.all([
        fetchSalesOverview(),
        fetchConversionFunnel(),
        fetchChannelAttribution(),
        listInquiries({ status: "open", limit: 5 }),
      ]);
      setOverview(nextOverview);
      setFunnel(nextFunnel);
      setChannels(nextChannels);
      setRecentInquiries(nextInquiries);
    } catch (nextError) {
      setError(nextError);
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

  const funnelCounts = useMemo(
    () => ({
      inquiries: overview?.effectiveInquiries ?? stepCount(funnel, "inquiries"),
      highIntent: overview?.highIntentCount ?? stepCount(funnel, "high_intent"),
      pendingQuote: overview?.pendingQuoteCount ?? stepCount(funnel, "pending_quote"),
      quoted: overview?.quotedCount ?? stepCount(funnel, "quoted"),
      won: overview?.wonCount ?? stepCount(funnel, "won"),
    }),
    [funnel, overview],
  );

  const hasData = useMemo(
    () =>
      funnelCounts.inquiries > 0 ||
      recentInquiries.length > 0 ||
      channels.some((item) => item.inquiryCount > 0),
    [channels, funnelCounts.inquiries, recentInquiries.length],
  );

  if (loading) {
    return (
      <ConsolePage>
        <Skeleton className="mb-4 h-16 w-full max-w-xl" />
        <div className="kpis">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-[110px] w-full rounded-[var(--radius-lg)]" />
          ))}
        </div>
      </ConsolePage>
    );
  }

  if (error) {
    const presentation = resolveRequestErrorPresentation(error, "无法加载工作台。");
    return (
      <ConsolePage>
        <ConsoleRequestError
          kind={presentation.kind}
          message={presentation.message}
          onRetry={() => void load()}
        />
      </ConsolePage>
    );
  }

  if (!hasData) {
    return (
      <ConsolePage>
        <V2PageHeader
          title="工作台"
          description="围绕询盘、报价与成交推进，查看今天最重要的机会。"
          badge="企业版"
        />
        <ConsoleEmptyState
          preset="noLeads"
          title="暂无业务数据"
          description="部署 Widget 并开始接待访客后，指标会出现在这里。"
          action={<DashboardEmptyAction />}
        />
      </ConsolePage>
    );
  }

  return (
    <ConsolePage>
      <V2PageHeader
        title="工作台"
        description="围绕询盘、报价与成交推进，查看今天最重要的机会。"
        badge="企业版"
        action={
          <Link href="/dashboard/inquiries" className="primary">
            + 创建询盘
          </Link>
        }
      />

      <div className="kpis ui-stagger-fade-in ui-hover-lift-children">
        <article className="card kpi">
          <div>
            <p>有效询盘</p>
            <strong>{funnelCounts.inquiries}</strong>
            <small>实时统计</small>
          </div>
          <div className="kpi-icon">
            <MessageSquare aria-hidden />
          </div>
        </article>
        <article className="card kpi">
          <div>
            <p>高意向客户</p>
            <strong>{funnelCounts.highIntent}</strong>
            <small>实时统计</small>
          </div>
          <div className="kpi-icon green">
            <Users aria-hidden />
          </div>
        </article>
        <article className="card kpi">
          <div>
            <p>待报价</p>
            <strong>{funnelCounts.pendingQuote}</strong>
            <small>实时统计</small>
          </div>
          <div className="kpi-icon orange">
            <FileText aria-hidden />
          </div>
        </article>
        <article className="card kpi">
          <div>
            <p>成交金额</p>
            <strong>{formatAmount(overview?.wonAmountTotal)}</strong>
            <small>已录入成交</small>
          </div>
          <div className="kpi-icon purple">
            <Wallet aria-hidden />
          </div>
        </article>
        <article className="card kpi">
          <div>
            <p>已报价</p>
            <strong>{funnelCounts.quoted}</strong>
            <small>跟进中</small>
          </div>
          <div className="kpi-icon cyan">
            <Clock3 aria-hidden />
          </div>
        </article>
      </div>

      <div className="grid3 ui-stagger-fade-in ui-hover-lift-children">
        <article className="card">
          <div className="sectionTitle">
            询盘趋势
            <div className="tabs-sm">
              <button type="button" className="active">
                周
              </button>
            </div>
          </div>
          <div className="panel">
            <p className="muted text-sm">趋势图将在接入完整报表 API 后展示，当前以 KPI 与漏斗为准。</p>
          </div>
        </article>

        <article className="card">
          <div className="sectionTitle">
            询盘来源 Top5
            <Link href="/dashboard/channels">查看全部</Link>
          </div>
          <div className="panel">
            <ChannelDonut channels={channels} />
          </div>
        </article>

        <article className="card">
          <div className="sectionTitle">
            待办任务 <span className="tag hot">{funnelCounts.pendingQuote + funnelCounts.highIntent}</span>
          </div>
          <div className="sideList">
            <div>
              待跟进高意向客户 <b>{funnelCounts.highIntent}</b>
            </div>
            <div>
              待报价 <b>{funnelCounts.pendingQuote}</b>
            </div>
            <div>
              已报价跟进 <b>{funnelCounts.quoted}</b>
            </div>
            <div>
              已成交 <b>{funnelCounts.won}</b>
            </div>
          </div>
          <div className="panel" style={{ paddingTop: 0 }}>
            <div className="quick">
              <Link href="/dashboard/bots" className="btn">
                创建机器人
              </Link>
              <Link href="/dashboard/knowledge-bases" className="btn">
                新建知识库
              </Link>
              <Link href="/dashboard/channels" className="btn">
                生成二维码
              </Link>
            </div>
          </div>
        </article>
      </div>

      <div className="grid2 ui-stagger-fade-in ui-hover-lift-children">
        <article className="card">
          <div className="sectionTitle">
            最新询盘
            <Link href="/dashboard/inquiries">查看全部</Link>
          </div>
          <div className="panel">
            {recentInquiries.length === 0 ? (
              <p className="table-empty">暂无开放询盘</p>
            ) : (
              <div className="table-scroll">
                <table className="table table-inquiry">
                <thead>
                  <tr>
                    <th>客户</th>
                    <th>来源</th>
                    <th>产品需求</th>
                    <th>意向等级</th>
                    <th>完整度</th>
                    <th>时间</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {recentInquiries.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.customerName}</strong>
                      </td>
                      <td>{SOURCE_LABELS[item.sourceType] ?? item.sourceType}</td>
                      <td className="table-cell-truncate" title={item.summary ?? undefined}>
                        {item.summary ?? "—"}
                      </td>
                      <td>
                        <V2IntentTag level={item.intentLevel} />
                      </td>
                      <td>{item.requirementCompleteness}%</td>
                      <td>{formatInquiryTime(item.updatedAt)}</td>
                      <td>
                        <Link href={`/dashboard/inquiries?selected=${item.id}`} className="btn">
                          查看
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
                </table>
              </div>
            )}
          </div>
        </article>

        <article className="card">
          <div className="sectionTitle">
            成交漏斗
            <button type="button" className="btn" onClick={() => void load(true)}>
              <RefreshCw className="mr-1 inline h-3.5 w-3.5" aria-hidden />
              刷新
            </button>
          </div>
          <div className="funnel">
            <div className="funnel-chart">
              <div>询盘数 {funnelCounts.inquiries}</div>
              <div>高意向 {funnelCounts.highIntent}</div>
              <div>待报价 {funnelCounts.pendingQuote}</div>
              <div>已报价 {funnelCounts.quoted}</div>
              <div>成交 {funnelCounts.won}</div>
            </div>
            <div className="funnel-metrics">
              <div className="funnel-metric">
                <label>询盘转高意向</label>
                <strong>{rateLabel(funnelCounts.highIntent, funnelCounts.inquiries)}</strong>
              </div>
              <div className="funnel-metric">
                <label>高意向转报价</label>
                <strong>{rateLabel(funnelCounts.pendingQuote + funnelCounts.quoted, funnelCounts.highIntent)}</strong>
              </div>
              <div className="funnel-metric">
                <label>报价转成交</label>
                <strong>{rateLabel(funnelCounts.won, funnelCounts.quoted)}</strong>
              </div>
              <div className="funnel-metric">
                <label>整体成交率</label>
                <strong>{rateLabel(funnelCounts.won, funnelCounts.inquiries)}</strong>
              </div>
            </div>
          </div>
        </article>
      </div>
    </ConsolePage>
  );
}
