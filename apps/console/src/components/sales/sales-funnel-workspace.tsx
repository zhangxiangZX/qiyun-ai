"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  FileDown,
  FileText,
  Info,
  ListChecks,
  MessageSquare,
  SlidersHorizontal,
  Wallet,
} from "lucide-react";

import { DataCenterToolbar } from "@/components/data-center/data-center-toolbar";
import {
  defaultDateRange,
  resolveDateRangeBounds,
  type DateRangeValue,
} from "@/components/ui/date-range-picker";
import { ConsoleRequestError, resolveRequestErrorPresentation } from "@/components/console/console-request-error";
import { HomeAssetIcon, HomeKpiTrend } from "@/components/dashboard/home-overview-parts";
import { SalesFunnelChart } from "@/components/sales/sales-funnel-chart";
import { homepageAssets } from "@/lib/homepage-assets";
import {
  fetchChannelAttribution,
  fetchConversionFunnel,
  fetchSalesOverview,
  formatAmount,
  listInquiries,
  listQuoteOpportunities,
} from "@/lib/sales/api";
import type {
  ChannelAttributionItem,
  ConversionFunnelStep,
  InquiryListItem,
  QuoteListItem,
  SalesOverviewMetrics,
  SourceType,
} from "@/lib/sales/types";
import { fetchConsoleMode, isPreviewMode } from "@/lib/api/mode";
import {
  MOCK_CHANNEL_ATTRIBUTION,
  MOCK_CONVERSION_FUNNEL,
  MOCK_SALES_OVERVIEW,
} from "@/lib/sales/analytics-mock-data";
import { MOCK_INQUIRIES } from "@/lib/sales/mock-data";
import { MOCK_QUOTE_OPPORTUNITIES } from "@/lib/sales/customers-mock-data";
import { useOnWorkspaceChanged } from "@/lib/workspace-events";
import styles from "@/styles/sales-funnel.module.css";

const LOST_REASON_LABELS: Record<string, string> = {
  price: "价格",
  delivery: "交期",
  spec_mismatch: "规格不符",
  project_paused: "项目暂停",
  competitor: "竞品",
  no_follow_up: "无回复",
  other: "其他",
};

const LOST_REASON_COLORS = ["#2563eb", "#3b82f6", "#f59e0b", "#22c55e", "#94a3b8"];

const SOURCE_ICON_BG: Record<SourceType, string> = {
  website: "#dbeafe",
  douyin: "#dcfce7",
  wechat: "#dcfce7",
  expo: "#f1f5f9",
  sales_link: "#f1f5f9",
  other: "#f1f5f9",
};

const FUNNEL_MOM = [
  { text: "▲ 23.5%", up: true },
  { text: "▲ 18.6%", up: true },
  { text: "▲ 12.3%", up: true },
  { text: "▼ 4.1%", up: false },
  { text: "▲ 2.3%", up: true },
  { text: "▲ 15.8%", up: true },
] as const;

const STAGE_TRANSITIONS = [
  { label: "新询盘 → 有效询盘", delta: "▲ 2.1pp", up: true },
  { label: "有效询盘 → 沟通中", delta: "▲ 1.8pp", up: true },
  { label: "沟通中 → 报价中", delta: "▼ 1.6pp", up: false },
  { label: "报价中 → 谈判中", delta: "▲ 0.7pp", up: true },
  { label: "谈判中 → 已成交", delta: "▲ 3.9pp", up: true },
] as const;

function stepCount(steps: ConversionFunnelStep[], key: string): number {
  return steps.find((step) => step.key === key)?.count ?? 0;
}

function pct(current: number, total: number): string {
  if (total <= 0) return "—";
  return `${((current / total) * 100).toFixed(1)}%`;
}

function pctNum(current: number, total: number): number {
  if (total <= 0 || current <= 0) return 0;
  return Math.min(100, (current / total) * 100);
}

function formatUpdateTime(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function formatDateRange(from: Date, to: Date): string {
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return `${fmt(from)} ~ ${fmt(to)}`;
}

function leadStageClass(stage: QuoteListItem["stage"]): string {
  if (stage === "confirming" || stage === "quoted") return styles.stageNegotiation;
  if (stage === "won") return styles.stageClosed;
  return styles.stageQuoting;
}

function leadStageLabel(stage: QuoteListItem["stage"]): string {
  if (stage === "confirming" || stage === "quoted") return "谈判中";
  if (stage === "to_quote" || stage === "collecting") return "报价中";
  if (stage === "won") return "已成交";
  return "跟进中";
}

function leadAmount(quote: QuoteListItem): number | null {
  return quote.wonAmount ?? quote.quotedAmount ?? quote.estimatedAmount;
}

function buildDonutSegments(items: Array<{ count: number; color: string }>) {
  const total = items.reduce((sum, item) => sum + item.count, 0);
  if (total <= 0) return null;
  const circumference = 2 * Math.PI * 58;
  let offset = 0;
  return items.map((item) => {
    const length = (item.count / total) * circumference;
    const segment = {
      color: item.color,
      dasharray: `${length} ${circumference - length}`,
      dashoffset: -offset,
    };
    offset += length;
    return segment;
  });
}

export function SalesFunnelWorkspace() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [updatedAt, setUpdatedAt] = useState(() => new Date());
  const [overview, setOverview] = useState<SalesOverviewMetrics | null>(null);
  const [funnel, setFunnel] = useState<ConversionFunnelStep[]>([]);
  const [channels, setChannels] = useState<ChannelAttributionItem[]>([]);
  const [quotes, setQuotes] = useState<QuoteListItem[]>([]);
  const [inquiries, setInquiries] = useState<InquiryListItem[]>([]);

  const [range, setRange] = useState<DateRangeValue>(() => defaultDateRange("30d"));
  const dateBounds = useMemo(() => resolveDateRangeBounds(range), [range]);
  const dateRange = useMemo(
    () => ({
      from: new Date(`${dateBounds.from}T00:00:00`),
      to: new Date(`${dateBounds.to}T23:59:59`),
    }),
    [dateBounds.from, dateBounds.to],
  );

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
        setQuotes(MOCK_QUOTE_OPPORTUNITIES);
        setInquiries(MOCK_INQUIRIES);
        setUpdatedAt(new Date());
        setLoading(false);
        return;
      }
      const [nextOverview, nextFunnel, nextChannels, nextQuotes, nextInquiries] = await Promise.all([
        fetchSalesOverview(),
        fetchConversionFunnel(),
        fetchChannelAttribution(),
        listQuoteOpportunities(),
        listInquiries({ status: "all", limit: 200 }),
      ]);
      setOverview(nextOverview);
      setFunnel(nextFunnel);
      setChannels(nextChannels);
      setQuotes(nextQuotes);
      setInquiries(nextInquiries);
      setUpdatedAt(new Date());
    } catch (nextError) {
      setError(nextError);
      setOverview(null);
      setFunnel([]);
      setChannels([]);
      setQuotes([]);
      setInquiries([]);
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

  const funnelStages = useMemo(() => {
    const newInquiries = stepCount(funnel, "conversations") || inquiries.length;
    const effective = overview?.effectiveInquiries ?? stepCount(funnel, "effective_inquiries");
    const communicating = overview?.highIntentCount ?? 0;
    const quoting = overview?.pendingQuoteCount ?? 0;
    const negotiating = overview?.quotedCount ?? 0;
    const won = overview?.wonCount ?? stepCount(funnel, "won");
    const base = newInquiries > 0 ? newInquiries : Math.max(effective, 1);

    return [
      { label: "新询盘", count: newInquiries, rate: "100%" },
      { label: "有效询盘", count: effective, rate: pct(effective, base) },
      { label: "沟通中", count: communicating, rate: pct(communicating, base) },
      { label: "报价中", count: quoting, rate: pct(quoting, base) },
      { label: "谈判中", count: negotiating, rate: pct(negotiating, base) },
      { label: "已成交", count: won, rate: pct(won, base) },
    ];
  }, [funnel, inquiries.length, overview]);

  const overallRate = funnelStages[0]?.count
    ? pct(funnelStages[5]?.count ?? 0, funnelStages[0].count)
    : "—";

  const stageTransitions = useMemo(() => {
    const counts = funnelStages.map((stage) => stage.count);
    return STAGE_TRANSITIONS.map((item, index) => {
      const from = counts[index] ?? 0;
      const to = counts[index + 1] ?? 0;
      return {
        ...item,
        rate: pctNum(to, from),
      };
    });
  }, [funnelStages]);

  const lostReasonStats = useMemo(() => {
    const lost = quotes.filter((item) => item.stage === "lost" && item.lostReason);
    const buckets = new Map<string, number>();
    for (const quote of lost) {
      const key = quote.lostReason ?? "other";
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }
    const sorted = [...buckets.entries()].sort((a, b) => b[1] - a[1]);
    const total = lost.length;
    return {
      total,
      items: sorted.map(([key, count], index) => ({
        key,
        label: LOST_REASON_LABELS[key] ?? key,
        count,
        percent: total > 0 ? ((count / total) * 100).toFixed(1) : "0",
        color: LOST_REASON_COLORS[index % LOST_REASON_COLORS.length],
      })),
    };
  }, [quotes]);

  const donutSegments = useMemo(
    () => buildDonutSegments(lostReasonStats.items.map((item) => ({ count: item.count, color: item.color }))),
    [lostReasonStats.items],
  );

  const highValueLeads = useMemo(
    () =>
      [...quotes]
        .filter((item) => ["to_quote", "quoted", "confirming", "won"].includes(item.stage))
        .sort((a, b) => (leadAmount(b) ?? 0) - (leadAmount(a) ?? 0))
        .slice(0, 5),
    [quotes],
  );

  const channelRows = useMemo(
    () =>
      [...channels]
        .sort((a, b) => b.inquiryCount - a.inquiryCount)
        .slice(0, 5)
        .map((item) => ({
          ...item,
          conversion:
            item.inquiryCount > 0
              ? `${((item.wonCount / item.inquiryCount) * 100).toFixed(1)}%`
              : "—",
        })),
    [channels],
  );

  const quotingCount = (overview?.pendingQuoteCount ?? 0) + (overview?.quotedCount ?? 0);

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.skeleton} style={{ height: 56 }} />
        <div className={styles.metrics}>
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className={styles.skeleton} style={{ height: 120 }} />
          ))}
        </div>
        <div className={styles.grid2}>
          <div className={styles.skeleton} style={{ height: 420 }} />
          <div className={styles.skeleton} style={{ height: 420 }} />
        </div>
      </div>
    );
  }

  if (error) {
    const presentation = resolveRequestErrorPresentation(error, "无法加载成交漏斗。");
    return (
      <ConsoleRequestError
        kind={presentation.kind}
        message={presentation.message}
        onRetry={() => void load()}
      />
    );
  }

  return (
    <>
      <DataCenterToolbar
        range={range}
        onRangeChange={setRange}
        onRefresh={() => void load()}
        refreshing={loading}
      />
      <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <div className={styles.updateTime}>
            <Clock size={14} aria-hidden />
            数据更新于 {formatUpdateTime(updatedAt)}
          </div>
        </div>
        <div className={styles.datePicker}>
          <Calendar size={14} aria-hidden />
          {formatDateRange(dateRange.from, dateRange.to)}
          <ChevronDown size={14} aria-hidden />
        </div>
      </header>

      <section className={styles.metrics}>
        <article className={styles.metricCard}>
          <div className={styles.metricIcon} style={{ background: "#3b82f6" }}>
            <MessageSquare size={22} aria-hidden />
          </div>
          <div className={styles.metricInfo}>
            <h3>总询盘数</h3>
            <div className={styles.metricValue}>
              {(funnelStages[0]?.count ?? 0).toLocaleString("zh-CN")}
            </div>
            <HomeKpiTrend text="较上月 23.5%" good />
          </div>
        </article>
        <article className={styles.metricCard}>
          <div className={styles.metricIcon} style={{ background: "#f59e0b" }}>
            <FileText size={22} aria-hidden />
          </div>
          <div className={styles.metricInfo}>
            <h3>报价中</h3>
            <div className={styles.metricValue}>{quotingCount.toLocaleString("zh-CN")}</div>
            <HomeKpiTrend text="较上月 17.0%" good />
          </div>
        </article>
        <article className={styles.metricCard}>
          <div className={styles.metricIcon} style={{ background: "#22c55e" }}>
            <CheckCircle2 size={22} aria-hidden />
          </div>
          <div className={styles.metricInfo}>
            <h3>已成交</h3>
            <div className={styles.metricValue}>
              {(overview?.wonCount ?? 0).toLocaleString("zh-CN")}
            </div>
            <HomeKpiTrend text="较上月 15.8%" good />
          </div>
        </article>
        <article className={styles.metricCard}>
          <div className={styles.metricIcon} style={{ background: "#8b5cf6" }}>
            <Wallet size={22} aria-hidden />
          </div>
          <div className={styles.metricInfo}>
            <h3>成交金额</h3>
            <div className={styles.metricValue}>{formatAmount(overview?.wonAmountTotal)}</div>
            <HomeKpiTrend text="较上月 31.4%" good />
          </div>
        </article>
      </section>

      <section className={styles.grid2}>
        <article className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>成交漏斗</h2>
          </div>
          <div className={styles.funnelWrapper}>
            <div className={styles.funnelChart}>
              <SalesFunnelChart />
            </div>
            <div className={styles.funnelLegend}>
              <div className={`${styles.funnelRow} ${styles.funnelRowHead}`}>
                <div className={styles.funnelLabel}>阶段</div>
                <div className={styles.funnelNum}>客户数</div>
                <div className={styles.funnelRate}>转化率</div>
                <div className={styles.funnelDelta}>较上月</div>
              </div>
              {funnelStages.map((stage, index) => {
                const mom = FUNNEL_MOM[index] ?? FUNNEL_MOM[0];
                return (
                  <div key={stage.label} className={styles.funnelRow}>
                    <div className={styles.funnelLabel}>{stage.label}</div>
                    <div className={styles.funnelNum}>{stage.count.toLocaleString("zh-CN")}</div>
                    <div className={styles.funnelRate}>{stage.rate}</div>
                    <div
                      className={`${styles.funnelDelta} ${mom.up ? styles.funnelDeltaUp : styles.funnelDeltaDown}`}
                    >
                      {mom.text}
                    </div>
                  </div>
                );
              })}
              <div className={styles.overallRate}>
                <Info size={16} color="#2563eb" aria-hidden />
                整体转化率（新询盘 → 已成交） <span>{overallRate}</span>
              </div>
            </div>
          </div>
        </article>

        <article className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>转化效率概览</h2>
            <Link href="/dashboard/reports/follow-up" className={styles.cardLink}>
              查看转化趋势 <ChevronRight size={14} aria-hidden />
            </Link>
          </div>
          <div className={styles.conversionStats}>
            <div className={styles.convStat}>
              <h4>阶段平均停留时长</h4>
              <div className={styles.convBig}>
                8.2 <span className={styles.convUnit}>天</span>
              </div>
              <div className={styles.convSub}>
                <span className={styles.funnelDeltaDown}>▼ 1.1天</span>{" "}
                <span className={styles.convSubMuted}>较上月</span>
              </div>
            </div>
            <div className={styles.convStat}>
              <h4>阶段流失客户数</h4>
              <div className={styles.convBig}>{lostReasonStats.total || "—"}</div>
              <div className={styles.convSub}>
                <span className={styles.funnelDeltaDown}>▲ 8.6%</span>{" "}
                <span className={styles.convSubMuted}>较上月</span>
              </div>
            </div>
            <div className={styles.convStat}>
              <h4>总体转化率</h4>
              <div className={styles.convBig}>{overallRate}</div>
              <div className={styles.convSub}>
                <span className={styles.funnelDeltaUp}>▲ 0.4pp</span>{" "}
                <span className={styles.convSubMuted}>较上月</span>
              </div>
            </div>
          </div>
          <div className={styles.progressList}>
            {stageTransitions.map((item) => (
              <div key={item.label} className={styles.progressItem}>
                <div className={styles.progressLabel}>{item.label}</div>
                <div className={styles.progressBarBg}>
                  <div className={styles.progressBarFill} style={{ width: `${item.rate}%` }} />
                </div>
                <div className={styles.progressRate}>{item.rate > 0 ? `${item.rate.toFixed(1)}%` : "—"}</div>
                <div className={item.up ? styles.progressDeltaUp : styles.progressDeltaDown}>{item.delta}</div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className={styles.grid4}>
        <article className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>渠道成交贡献</h2>
            <Link href="/dashboard/reports/channel" className={styles.cardLink}>
              查看全部 <ChevronRight size={14} aria-hidden />
            </Link>
          </div>
          {channelRows.length === 0 ? (
            <p className={styles.emptyHint}>暂无渠道数据</p>
          ) : (
            <table className={styles.channelTable}>
              <thead>
                <tr>
                  <th>渠道</th>
                  <th>客户数</th>
                  <th>转化率</th>
                  <th>成交金额</th>
                </tr>
              </thead>
              <tbody>
                {channelRows.map((item) => (
                  <tr key={`${item.sourceCode ?? "none"}-${item.sourceType}`}>
                    <td>
                      <div className={styles.channelName}>
                        <div
                          className={styles.channelIcon}
                          style={{ background: SOURCE_ICON_BG[item.sourceType] }}
                        >
                          <HomeAssetIcon src={homepageAssets.kpi.validInquiry} size={18} />
                        </div>
                        {item.sourceLabel}
                      </div>
                    </td>
                    <td>{item.inquiryCount.toLocaleString("zh-CN")}</td>
                    <td>{item.conversion}</td>
                    <td>{formatAmount(item.wonAmountTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <Link href="/dashboard/reports/channel" className={styles.cardLink} style={{ marginTop: 12 }}>
            查看渠道详情 <ChevronRight size={14} aria-hidden />
          </Link>
        </article>

        <article className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>丢单原因分析</h2>
          </div>
          {lostReasonStats.total === 0 ? (
            <p className={styles.emptyHint}>暂无丢单数据</p>
          ) : (
            <div className={styles.donutWrapper}>
              <div className={styles.donutChart}>
                <svg width="140" height="140" viewBox="0 0 140 140" aria-hidden>
                  {donutSegments?.map((segment, index) => (
                    <circle
                      key={index}
                      cx="70"
                      cy="70"
                      r="58"
                      fill="none"
                      stroke={segment.color}
                      strokeWidth="18"
                      strokeDasharray={segment.dasharray}
                      strokeDashoffset={segment.dashoffset}
                      transform="rotate(-90 70 70)"
                    />
                  ))}
                </svg>
                <div className={styles.donutCenter}>
                  <div className={styles.donutCenterNum}>{lostReasonStats.total}</div>
                  <div className={styles.donutCenterLabel}>丢单客户数</div>
                </div>
              </div>
              <div className={styles.legendList}>
                {lostReasonStats.items.map((item) => (
                  <div key={item.key} className={styles.legendItem}>
                    <div className={styles.legendLeft}>
                      <div className={styles.legendDot} style={{ background: item.color }} />
                      {item.label}
                    </div>
                    <div>
                      <strong>{item.percent}%</strong>{" "}
                      <span className={styles.legendValue}>({item.count})</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <Link href="/dashboard/inquiries" className={styles.cardLink} style={{ marginTop: 14 }}>
            查看原因详情 <ChevronRight size={14} aria-hidden />
          </Link>
        </article>

        <article className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>高价值成交线索</h2>
            <Link href="/dashboard/inquiries" className={styles.cardLink}>
              查看全部 <ChevronRight size={14} aria-hidden />
            </Link>
          </div>
          {highValueLeads.length === 0 ? (
            <p className={styles.emptyHint}>暂无高价值线索</p>
          ) : (
            <>
              <div className={styles.leadHead}>
                <div>客户名称</div>
                <div>当前阶段</div>
                <div style={{ textAlign: "center" }}>负责人</div>
                <div style={{ textAlign: "right" }}>成交金额</div>
              </div>
              {highValueLeads.map((item) => (
                <div key={item.id} className={styles.leadItem}>
                  <div className={styles.leadName}>{item.customerName}</div>
                  <div>
                    <span className={`${styles.leadStage} ${leadStageClass(item.stage)}`}>
                      {leadStageLabel(item.stage)}
                    </span>
                  </div>
                  <div className={styles.leadOwner}>{item.ownerId ? "已分配" : "—"}</div>
                  <div className={styles.leadAmount}>{formatAmount(leadAmount(item))}</div>
                </div>
              ))}
            </>
          )}
        </article>

        <article className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>快捷操作</h2>
          </div>
          <div className={styles.quickGrid}>
            <Link href="/dashboard/reports/export" className={styles.quickItem}>
              <div className={styles.quickIcon} style={{ background: "#dbeafe" }}>
                <FileDown size={22} color="#2563eb" aria-hidden />
              </div>
              <span className={styles.quickLabel}>导出报表</span>
            </Link>
            <Link href="/dashboard/quotes" className={styles.quickItem}>
              <div className={styles.quickIcon} style={{ background: "#dcfce7" }}>
                <FileText size={22} color="#16a34a" aria-hidden />
              </div>
              <span className={styles.quickLabel}>查看报价</span>
            </Link>
            <Link href="/dashboard/tasks" className={styles.quickItem}>
              <div className={styles.quickIcon} style={{ background: "#fef3c7" }}>
                <ListChecks size={22} color="#d97706" aria-hidden />
              </div>
              <span className={styles.quickLabel}>跟进任务</span>
            </Link>
            <span
              className={styles.quickItem}
              title="自定义漏斗即将上线"
              aria-disabled="true"
              style={{ opacity: 0.55, cursor: "not-allowed" }}
            >
              <div className={styles.quickIcon} style={{ background: "#dbeafe" }}>
                <SlidersHorizontal size={22} color="#2563eb" aria-hidden />
              </div>
              <span className={styles.quickLabel}>自定义漏斗</span>
            </span>
          </div>
        </article>
      </section>
    </div>
    </>
  );
}
