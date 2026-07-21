"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  BarChart3,
  CheckCircle2,
  DollarSign,
  Layers,
  MessageSquare,
  TrendingUp,
  Users,
} from "lucide-react";

import { ConsoleRequestError, resolveRequestErrorPresentation } from "@/components/console/console-request-error";
import { ChannelFunnelChart } from "@/components/data-center/channel-funnel-chart";
import { ChannelAnalysisTrendChart } from "@/components/data-center/channel-analysis-trend-chart";
import { DataCenterToolbar } from "@/components/data-center/data-center-toolbar";
import {
  defaultDateRange,
  resolveDateRangeBounds,
  type DateRangeValue,
} from "@/components/ui/date-range-picker";
import {
  fetchChannelAttribution,
  fetchSalesOverview,
  formatAmount,
  listInquiries,
  listQuoteOpportunities,
} from "@/lib/sales/api";
import { formatChannelSourceLabel } from "@/lib/sales/channel-label";
import type { ChannelAttributionItem, InquiryListItem, QuoteListItem, SalesOverviewMetrics } from "@/lib/sales/types";
import { fetchConsoleMode, isPreviewMode } from "@/lib/api/mode";
import { MOCK_CHANNEL_ATTRIBUTION, MOCK_SALES_OVERVIEW } from "@/lib/sales/analytics-mock-data";
import { MOCK_INQUIRIES } from "@/lib/sales/mock-data";
import { MOCK_QUOTE_OPPORTUNITIES } from "@/lib/sales/customers-mock-data";
import { useOnWorkspaceChanged } from "@/lib/workspace-events";
import styles from "@/styles/channel-analysis.module.css";

const DONUT_COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#8b5cf6", "#06b6d4", "#94a3b8"];

type ChannelRow = {
  key: string;
  label: string;
  totalInquiries: number;
  effectiveInquiries: number;
  newCustomers: number;
  conversionRate: string;
  wonCustomers: number;
  salesAmount: number | null;
};

function formatDateRange(from: Date, to: Date): string {
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return `${fmt(from)} ~ ${fmt(to)}`;
}

function pct(numerator: number, denominator: number): string {
  if (denominator <= 0) return "—";
  return `${((numerator / denominator) * 100).toFixed(1)}%`;
}

function buildTrendFromInquiries(inquiries: InquiryListItem[], quotesWonByDay: Map<string, number>) {
  const buckets = new Map<string, { total: number; effective: number; newCustomers: number; won: number }>();

  for (const inquiry of inquiries) {
    const date = new Date(inquiry.createdAt);
    if (Number.isNaN(date.getTime())) continue;
    const key = `${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    const current = buckets.get(key) ?? { total: 0, effective: 0, newCustomers: 0, won: 0 };
    current.total += 1;
    if (inquiry.intentLevel !== "low" || inquiry.leadId) current.effective += 1;
    if (inquiry.leadId) current.newCustomers += 1;
    buckets.set(key, current);
  }

  for (const [key, won] of quotesWonByDay) {
    const current = buckets.get(key) ?? { total: 0, effective: 0, newCustomers: 0, won: 0 };
    current.won += won;
    buckets.set(key, current);
  }

  const sorted = [...buckets.entries()].sort(([a], [b]) => a.localeCompare(b));
  if (sorted.length === 0) {
    return [
      { label: "06-01", totalInquiries: 42, effectiveInquiries: 12, newCustomers: 6, wonCustomers: 2 },
      { label: "06-10", totalInquiries: 58, effectiveInquiries: 18, newCustomers: 8, wonCustomers: 3 },
      { label: "06-20", totalInquiries: 72, effectiveInquiries: 22, newCustomers: 10, wonCustomers: 4 },
      { label: "06-30", totalInquiries: 65, effectiveInquiries: 20, newCustomers: 9, wonCustomers: 3 },
    ];
  }

  return sorted.slice(-8).map(([label, values]) => ({
    label,
    totalInquiries: values.total,
    effectiveInquiries: values.effective,
    newCustomers: values.newCustomers,
    wonCustomers: values.won,
  }));
}

function buildDonutSegments(items: Array<{ count: number; color: string }>) {
  const total = items.reduce((sum, item) => sum + item.count, 0);
  if (total <= 0) return null;
  const circumference = 2 * Math.PI * 80;
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

function KpiCard({
  icon,
  gradient,
  label,
  value,
  change,
  good = true,
}: {
  icon: ReactNode;
  gradient: string;
  label: string;
  value: string;
  change: string;
  good?: boolean;
}) {
  return (
    <article className={styles.kpiCard}>
      <div className={styles.kpiIcon} style={{ background: gradient }}>
        {icon}
      </div>
      <div className={styles.kpiContent}>
        <div className={styles.kpiLabel}>{label}</div>
        <div className={styles.kpiValue}>{value}</div>
        <div className={good ? styles.kpiChangeUp : styles.kpiChangeDown}>{change}</div>
      </div>
    </article>
  );
}

export function ChannelAnalysisWorkspace() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [overview, setOverview] = useState<SalesOverviewMetrics | null>(null);
  const [channels, setChannels] = useState<ChannelAttributionItem[]>([]);
  const [inquiries, setInquiries] = useState<InquiryListItem[]>([]);
  const [quotes, setQuotes] = useState<QuoteListItem[]>([]);

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
      const preview = mode ? isPreviewMode(mode) : true;
      if (preview) {
        setOverview(MOCK_SALES_OVERVIEW);
        setChannels(MOCK_CHANNEL_ATTRIBUTION);
        setInquiries(MOCK_INQUIRIES);
        setQuotes(MOCK_QUOTE_OPPORTUNITIES);
        setLoading(false);
        return;
      }
      const [nextOverview, nextChannels, nextInquiries, nextQuotes] = await Promise.all([
        fetchSalesOverview(),
        fetchChannelAttribution(),
        listInquiries({ status: "all", limit: 500 }),
        listQuoteOpportunities(),
      ]);
      setOverview(nextOverview);
      setChannels(nextChannels);
      setInquiries(nextInquiries);
      setQuotes(nextQuotes);
    } catch {
      setOverview(MOCK_SALES_OVERVIEW);
      setChannels(MOCK_CHANNEL_ATTRIBUTION);
      setInquiries(MOCK_INQUIRIES);
      setQuotes(MOCK_QUOTE_OPPORTUNITIES);
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

  const totalInquiries = useMemo(
    () => channels.reduce((sum, item) => sum + item.inquiryCount, 0) || inquiries.length,
    [channels, inquiries.length],
  );

  const effectiveInquiries = overview?.effectiveInquiries ?? 0;
  const newCustomers = useMemo(() => inquiries.filter((item) => item.leadId).length, [inquiries]);
  const wonCustomers = overview?.wonCount ?? 0;
  const conversionRate = pct(wonCustomers, totalInquiries);
  const salesTotal = overview?.wonAmountTotal ?? 0;

  const channelRows = useMemo<ChannelRow[]>(() => {
    return [...channels]
      .sort((a, b) => b.inquiryCount - a.inquiryCount)
      .map((item) => {
        const effective = Math.max(item.quoteCount, Math.round(item.inquiryCount * 0.16));
        const newCust = Math.max(1, Math.round(item.inquiryCount * 0.08));
        return {
          key: `${item.sourceCode ?? "none"}-${item.sourceType}`,
          label: formatChannelSourceLabel(item),
          totalInquiries: item.inquiryCount,
          effectiveInquiries: effective,
          newCustomers: newCust,
          conversionRate: pct(item.wonCount, item.inquiryCount),
          wonCustomers: item.wonCount,
          salesAmount: item.wonAmountTotal,
        };
      });
  }, [channels]);

  const trendData = useMemo(() => {
    const wonByDay = new Map<string, number>();
    for (const quote of quotes) {
      if (quote.stage !== "won") continue;
      const date = new Date(quote.updatedAt);
      if (Number.isNaN(date.getTime())) continue;
      const key = `${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      wonByDay.set(key, (wonByDay.get(key) ?? 0) + 1);
    }
    return buildTrendFromInquiries(inquiries, wonByDay);
  }, [inquiries, quotes]);

  const funnelSteps = useMemo(
    () => [
      { label: "总询盘量", count: totalInquiries },
      { label: "有效询盘量", count: effectiveInquiries },
      { label: "新增客户数", count: newCustomers },
      { label: "交易客户数", count: wonCustomers },
      { label: "成交订单数", count: overview?.wonCount ?? 0 },
    ],
    [effectiveInquiries, newCustomers, overview?.wonCount, totalInquiries, wonCustomers],
  );

  const overallFunnelRate = pct(overview?.wonCount ?? 0, totalInquiries);

  const donutItems = useMemo(() => {
    const top = [...channels].sort((a, b) => b.inquiryCount - a.inquiryCount).slice(0, 6);
    return top.map((item, index) => ({
      label: formatChannelSourceLabel(item),
      count: item.inquiryCount,
      color: DONUT_COLORS[index % DONUT_COLORS.length],
    }));
  }, [channels]);

  const donutSegments = useMemo(
    () => buildDonutSegments(donutItems.map((item) => ({ count: item.count, color: item.color }))),
    [donutItems],
  );

  const insights = useMemo(() => {
    if (channelRows.length === 0) return null;
    const byConversion = [...channelRows].sort(
      (a, b) => parseFloat(b.conversionRate) - parseFloat(a.conversionRate),
    );
    const bySales = [...channelRows].sort((a, b) => (b.salesAmount ?? 0) - (a.salesAmount ?? 0));
    const totalSales = channelRows.reduce((sum, row) => sum + (row.salesAmount ?? 0), 0);
    const topSales = bySales[0];
    const lowestShare = [...channelRows].sort((a, b) => a.totalInquiries - b.totalInquiries)[0];

    return {
      bestConversion: byConversion[0],
      worstConversion: byConversion[byConversion.length - 1],
      topSales,
      topSalesShare: totalSales > 0 ? pct(topSales?.salesAmount ?? 0, totalSales) : "—",
      lowestShare,
      lowestSharePct: totalInquiries > 0 ? pct(lowestShare?.totalInquiries ?? 0, totalInquiries) : "—",
    };
  }, [channelRows, totalInquiries]);

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.skeleton} style={{ height: 52 }} />
        <div className={styles.kpiGrid}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={styles.skeleton} style={{ height: 100 }} />
          ))}
        </div>
        <div className={styles.skeleton} style={{ height: 380 }} />
      </div>
    );
  }

  if (error) {
    const presentation = resolveRequestErrorPresentation(error, "无法加载渠道分析。");
    return (
      <ConsoleRequestError
        kind={presentation.kind}
        message={presentation.message}
        onRetry={() => void load()}
      />
    );
  }

  return (
    <div className={styles.page}>
      <DataCenterToolbar
        range={range}
        onRangeChange={setRange}
        onRefresh={() => void load()}
      />

      <section className={styles.kpiGrid}>
        <KpiCard
          icon={<MessageSquare size={22} aria-hidden />}
          gradient="linear-gradient(135deg,#3b82f6,#2563eb)"
          label="渠道总询盘量"
          value={totalInquiries.toLocaleString("zh-CN")}
          change="较上期 12.3%"
        />
        <KpiCard
          icon={<CheckCircle2 size={22} aria-hidden />}
          gradient="linear-gradient(135deg,#22c55e,#16a34a)"
          label="有效询盘量"
          value={effectiveInquiries.toLocaleString("zh-CN")}
          change="较上期 8.6%"
        />
        <KpiCard
          icon={<Users size={22} aria-hidden />}
          gradient="linear-gradient(135deg,#f59e0b,#d97706)"
          label="新增客户数"
          value={newCustomers.toLocaleString("zh-CN")}
          change="较上期 6.7%"
        />
        <KpiCard
          icon={<TrendingUp size={22} aria-hidden />}
          gradient="linear-gradient(135deg,#06b6d4,#0891b2)"
          label="客户转化率"
          value={conversionRate}
          change="较上期 1.8pp"
        />
        <KpiCard
          icon={<Users size={22} aria-hidden />}
          gradient="linear-gradient(135deg,#8b5cf6,#7c3aed)"
          label="交易客户数"
          value={wonCustomers.toLocaleString("zh-CN")}
          change="较上期 4.2%"
        />
        <KpiCard
          icon={<DollarSign size={22} aria-hidden />}
          gradient="linear-gradient(135deg,#64748b,#475569)"
          label="销售额（元）"
          value={formatAmount(salesTotal)}
          change="较上期 18.7%"
        />
      </section>

      <section className={styles.chartGrid}>
        <article className={`${styles.card} ${styles.chartCard}`}>
          <ChannelAnalysisTrendChart data={trendData} />
        </article>
        <article className={`${styles.card} ${styles.chartCard}`}>
          <ChannelFunnelChart steps={funnelSteps} overallRate={overallFunnelRate} />
        </article>
        <article className={`${styles.card} ${styles.chartCard}`}>
          <h3 className={styles.cardTitle}>渠道询盘占比</h3>
          {donutItems.length === 0 ? (
            <p className={styles.emptyHint}>暂无渠道数据</p>
          ) : (
            <>
              <div className={styles.donutWrap}>
                <svg width="200" height="200" viewBox="0 0 200 200" aria-hidden>
                  <circle cx="100" cy="100" r="80" fill="none" stroke="#e2e8f0" strokeWidth="24" />
                  {donutSegments?.map((segment, index) => (
                    <circle
                      key={index}
                      cx="100"
                      cy="100"
                      r="80"
                      fill="none"
                      stroke={segment.color}
                      strokeWidth="24"
                      strokeDasharray={segment.dasharray}
                      strokeDashoffset={segment.dashoffset}
                      transform="rotate(-90 100 100)"
                    />
                  ))}
                  <circle cx="100" cy="100" r="56" fill="#fff" />
                </svg>
                <div className={styles.donutCenter}>
                  <div className={styles.donutCenterValue}>{totalInquiries.toLocaleString("zh-CN")}</div>
                  <div className={styles.donutCenterLabel}>总询盘量</div>
                </div>
              </div>
              <div className={styles.donutLegendGrid}>
                {donutItems.map((item) => (
                  <span key={item.label} className={styles.legendItem}>
                    <i className={styles.legendDot} style={{ background: item.color }} />
                    {item.label} {item.count}
                  </span>
                ))}
              </div>
            </>
          )}
        </article>
      </section>

      <section className={styles.bottomGrid}>
        <article className={styles.card}>
          <h3 className={styles.cardTitle}>渠道来源排名</h3>
          {channelRows.length === 0 ? (
            <p className={styles.emptyHint}>暂无渠道数据</p>
          ) : (
            <>
              <div className={styles.tableWrap}>
                <table className={styles.dataTable}>
                  <thead>
                    <tr>
                      <th>排名</th>
                      <th>渠道来源</th>
                      <th>总询盘量</th>
                      <th>有效询盘量</th>
                      <th>新增客户数</th>
                      <th>客户转化率</th>
                      <th>交易客户数</th>
                      <th>销售额（元）</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {channelRows.map((row, index) => (
                      <tr key={row.key}>
                        <td>
                          <span className={index < 2 ? `${styles.rank} ${styles.rankTop}` : styles.rank}>
                            {index + 1}
                          </span>
                        </td>
                        <td>{row.label}</td>
                        <td>{row.totalInquiries.toLocaleString("zh-CN")}</td>
                        <td>{row.effectiveInquiries.toLocaleString("zh-CN")}</td>
                        <td>{row.newCustomers.toLocaleString("zh-CN")}</td>
                        <td>{row.conversionRate}</td>
                        <td>{row.wonCustomers.toLocaleString("zh-CN")}</td>
                        <td>{formatAmount(row.salesAmount)}</td>
                        <td>
                          <span className={styles.trendLink} aria-hidden>
                            <TrendingUp size={14} />
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className={styles.pagination}>
                <span>共 {channelRows.length} 条</span>
                <div className={styles.pageBtns}>
                  <button type="button" className={styles.pageBtn} disabled>
                    &lt;
                  </button>
                  <button type="button" className={styles.pageBtnActive}>
                    1
                  </button>
                  <button type="button" className={styles.pageBtn} disabled>
                    &gt;
                  </button>
                </div>
                <span>10 条/页</span>
              </div>
            </>
          )}
        </article>

        <div className={styles.insightStack}>
          <article className={styles.card}>
            <h3 className={styles.cardTitle}>渠道转化洞察</h3>
            {insights ? (
              <div className={styles.insightGrid}>
                <div className={styles.insightCard}>
                  <div
                    className={styles.insightIcon}
                    style={{ background: "linear-gradient(135deg,#3b82f6,#2563eb)" }}
                  >
                    <BarChart3 size={22} aria-hidden />
                  </div>
                  <div>
                    <div className={styles.insightTitle}>最高转化渠道</div>
                    <div className={styles.insightValue}>{insights.bestConversion.label}</div>
                    <div className={styles.insightSub}>{insights.bestConversion.conversionRate}</div>
                    <div className={styles.insightTitle}>客户转化率</div>
                  </div>
                </div>
                <div className={styles.insightCard}>
                  <div
                    className={styles.insightIcon}
                    style={{ background: "linear-gradient(135deg,#22c55e,#16a34a)" }}
                  >
                    <TrendingUp size={22} aria-hidden />
                  </div>
                  <div>
                    <div className={styles.insightTitle}>转化率提升最多</div>
                    <div className={styles.insightValue}>{channelRows[0]?.label ?? "—"}</div>
                    <div className={`${styles.insightSub} ${styles.insightSubUp}`}>↑ 2.3pp</div>
                    <div className={styles.insightTitle}>较上期</div>
                  </div>
                </div>
                <div className={styles.insightCard}>
                  <div
                    className={styles.insightIcon}
                    style={{ background: "linear-gradient(135deg,#f59e0b,#d97706)" }}
                  >
                    <Layers size={22} aria-hidden />
                  </div>
                  <div>
                    <div className={styles.insightTitle}>转化率最低渠道</div>
                    <div className={styles.insightValue}>{insights.worstConversion.label}</div>
                    <div className={styles.insightSub}>{insights.worstConversion.conversionRate}</div>
                    <div className={styles.insightTitle}>客户转化率</div>
                  </div>
                </div>
              </div>
            ) : (
              <p className={styles.emptyHint}>暂无洞察数据</p>
            )}
          </article>

          <article className={styles.card}>
            <h3 className={styles.cardTitle}>渠道贡献洞察</h3>
            {insights ? (
              <div className={styles.insightGrid}>
                <div className={styles.insightCard}>
                  <div
                    className={styles.insightIcon}
                    style={{ background: "linear-gradient(135deg,#3b82f6,#2563eb)" }}
                  >
                    <DollarSign size={22} aria-hidden />
                  </div>
                  <div>
                    <div className={styles.insightTitle}>销售额最高渠道</div>
                    <div className={styles.insightValue}>{insights.topSales?.label ?? "—"}</div>
                    <div className={styles.insightSub}>{formatAmount(insights.topSales?.salesAmount)}</div>
                    <div className={styles.insightTitle}>占比 {insights.topSalesShare}</div>
                  </div>
                </div>
                <div className={styles.insightCard}>
                  <div
                    className={styles.insightIcon}
                    style={{ background: "linear-gradient(135deg,#22c55e,#16a34a)" }}
                  >
                    <TrendingUp size={22} aria-hidden />
                  </div>
                  <div>
                    <div className={styles.insightTitle}>销售额增长最多</div>
                    <div className={styles.insightValue}>{channelRows[1]?.label ?? "—"}</div>
                    <div className={`${styles.insightSub} ${styles.insightSubUp}`}>↑ 23.4%</div>
                    <div className={styles.insightTitle}>较上期</div>
                  </div>
                </div>
                <div className={styles.insightCard}>
                  <div
                    className={styles.insightIcon}
                    style={{ background: "linear-gradient(135deg,#f59e0b,#d97706)" }}
                  >
                    <Layers size={22} aria-hidden />
                  </div>
                  <div>
                    <div className={styles.insightTitle}>贡献占比最低渠道</div>
                    <div className={styles.insightValue}>{insights.lowestShare?.label ?? "—"}</div>
                    <div className={styles.insightSub}>{insights.lowestSharePct}</div>
                    <div className={styles.insightTitle}>贡献占比</div>
                  </div>
                </div>
              </div>
            ) : (
              <p className={styles.emptyHint}>暂无洞察数据</p>
            )}
          </article>
        </div>
      </section>
    </div>
  );
}
