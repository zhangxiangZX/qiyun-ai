"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  BellRing,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  FileText,
  Flag,
  MessageSquareText,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";

import { Skeleton } from "@qiyun/ui";

import { MiniLineChart } from "@/components/dashboard/charts/mini-line-chart";
import {
  BOSS_KPIS,
  CHANNEL_DISTRIBUTION,
  HOT_OPPORTUNITIES,
  MANAGEMENT_ALERTS,
  SALES_RANKING,
  TREND_7D_DEALS,
  TREND_7D_INQUIRIES,
  TREND_7D_LABELS,
} from "@/components/dashboard/mocks/boss-data";
import { useRoleDashboardData } from "@/components/dashboard/role-dashboard-shared";
import {
  DateRangePicker,
  defaultDateRange,
  resolveDateRangeBounds,
  type DateRangeValue,
} from "@/components/ui/date-range-picker";
import {
  mapBossKpis,
  mapChannelDistribution,
  mapHotOpportunities,
  mapManagementAlerts,
  mapSalesRanking,
  mapTrendSeries,
} from "@/lib/dashboard/role-dashboard-mappers";
import styles from "@/styles/boss-dashboard.module.css";

const KPI_ICONS = [MessageSquareText, UsersRound, FileText, Clock3, CircleDollarSign, X] as const;
const KPI_TONES = ["blue", "green", "orange", "purple", "cyan", "red"] as const;

const ALERT_ICONS = [Flag, FileText, Clock3, BellRing] as const;
const ALERT_TONES = ["orange", "blue", "purple", "green"] as const;

function IntentFlames({ count }: { count: number }) {
  return (
    <span className={styles.flames} aria-label={`${count} 级意向`}>
      {Array.from({ length: 3 }, (_, index) => (
        <span key={index} data-active={index < count}>♦</span>
      ))}
    </span>
  );
}

function RankBadge({ rank }: { rank: number }) {
  return <span className={styles.rankBadge} data-rank={rank <= 3 ? rank : undefined}>{rank}</span>;
}

type TrendGranularity = "day" | "week";

const GRANULARITY_OPTIONS: { value: TrendGranularity; label: string }[] = [
  { value: "day", label: "按日" },
  { value: "week", label: "按周" },
];

/** 将按日序列聚合成按周（每 7 天一段，末段不足也保留） */
function aggregateTrendByWeek(series: {
  labels: string[];
  inquiries: number[];
  deals: number[];
}): { labels: string[]; inquiries: number[]; deals: number[] } {
  const labels: string[] = [];
  const inquiries: number[] = [];
  const deals: number[] = [];
  for (let i = 0; i < series.labels.length; i += 7) {
    const end = Math.min(i + 6, series.labels.length - 1);
    const sliceInquiries = series.inquiries.slice(i, end + 1);
    const sliceDeals = series.deals.slice(i, end + 1);
    labels.push(
      series.labels[i] === series.labels[end]
        ? series.labels[i]
        : `${series.labels[i]}~${series.labels[end]}`,
    );
    inquiries.push(sliceInquiries.reduce((sum, n) => sum + n, 0));
    deals.push(sliceDeals.reduce((sum, n) => sum + n, 0));
  }
  return { labels, inquiries, deals };
}

export function BossDashboardWorkspace() {
  const {
    loading,
    refreshing,
    refresh,
    isPreview,
    snapshot,
    overview,
    channels,
    inquiries,
    sites,
  } = useRoleDashboardData();

  const [range, setRange] = useState<DateRangeValue>(() => defaultDateRange("7d"));
  const [granularity, setGranularity] = useState<TrendGranularity>("day");
  const [granularityOpen, setGranularityOpen] = useState(false);
  const granularityRef = useRef<HTMLDivElement>(null);
  const [rankingMetric, setRankingMetric] = useState<"amount" | "inquiries" | "lost">("amount");

  useEffect(() => {
    if (!granularityOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!granularityRef.current?.contains(event.target as Node)) {
        setGranularityOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setGranularityOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [granularityOpen]);

  const rangeBounds = useMemo(() => resolveDateRangeBounds(range), [range]);

  const filteredInquiries = useMemo(() => {
    if (isPreview) return inquiries;
    const fromMs = Date.parse(`${rangeBounds.from}T00:00:00`);
    const toMs = Date.parse(`${rangeBounds.to}T23:59:59`);
    return inquiries.filter((item) => {
      const created = Date.parse(item.createdAt);
      return created >= fromMs && created <= toMs;
    });
  }, [isPreview, inquiries, rangeBounds]);

  const kpis = useMemo(
    () => (isPreview ? BOSS_KPIS : mapBossKpis(overview, filteredInquiries)),
    [isPreview, overview, filteredInquiries],
  );
  const trend = useMemo(() => {
    const daily = isPreview
      ? { labels: TREND_7D_LABELS, inquiries: TREND_7D_INQUIRIES, deals: TREND_7D_DEALS }
      : mapTrendSeries(
          snapshot,
          { from: rangeBounds.from, to: rangeBounds.to },
          overview,
          filteredInquiries,
        );
    return granularity === "week" ? aggregateTrendByWeek(daily) : daily;
  }, [
    isPreview,
    snapshot,
    rangeBounds.from,
    rangeBounds.to,
    overview,
    filteredInquiries,
    granularity,
  ]);
  const salesRanking = useMemo(() => {
    if (isPreview) {
      const sorted = [...SALES_RANKING].sort((a, b) => {
        if (rankingMetric === "inquiries") return b.deals - a.deals;
        if (rankingMetric === "lost") {
          // Preview mock has no lost count — keep amount order with slight shuffle by rank.
          return a.rank - b.rank;
        }
        const amountA = Number(a.amount.replace(/[^\d.]/g, "")) || 0;
        const amountB = Number(b.amount.replace(/[^\d.]/g, "")) || 0;
        return amountB - amountA;
      });
      return sorted.map((item, index) => ({
        ...item,
        rank: index + 1,
        amount:
          rankingMetric === "inquiries"
            ? String(item.deals)
            : rankingMetric === "lost"
              ? "—"
              : item.amount,
      }));
    }
    return mapSalesRanking(filteredInquiries, rankingMetric);
  }, [isPreview, filteredInquiries, rankingMetric]);

  const hotOpportunities = useMemo(
    () => (isPreview ? HOT_OPPORTUNITIES : mapHotOpportunities(filteredInquiries)),
    [isPreview, filteredInquiries],
  );
  const channelDistribution = useMemo(
    () => (isPreview ? CHANNEL_DISTRIBUTION : mapChannelDistribution(channels, snapshot, sites)),
    [isPreview, channels, snapshot, sites],
  );
  const managementAlerts = useMemo(
    () => (isPreview ? MANAGEMENT_ALERTS : mapManagementAlerts(overview, filteredInquiries)),
    [isPreview, overview, filteredInquiries],
  );

  const totalChannels = channelDistribution.reduce((sum, item) => sum + item.value, 0) || 1;
  const channelGradient = channelDistribution.reduce(
    (result, item, index, all) => {
      const before = all.slice(0, index).reduce((sum, entry) => sum + entry.value, 0);
      const start = (before / totalChannels) * 100;
      const end = ((before + item.value) / totalChannels) * 100;
      return `${result}${index ? "," : ""}${item.color} ${start}% ${end}%`;
    },
    "conic-gradient(",
  ) + ")";

  if (loading && !isPreview) {
    return (
      <div className={styles.page}>
        <Skeleton className="mb-4 h-12 w-full rounded-xl" />
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-28 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="mt-4 h-80 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <DateRangePicker value={range} onChange={setRange} />
        <button type="button" className={styles.refreshButton} onClick={refresh} disabled={refreshing}>
          <RefreshCw size={17} className={refreshing ? styles.spinning : undefined} aria-hidden />
          刷新
        </button>
      </div>

      <section className={styles.kpiGrid} aria-label="经营指标">
        {kpis.map((kpi, index) => {
          const Icon = KPI_ICONS[index];
          return (
            <article className={styles.kpiCard} key={kpi.label}>
              <span className={styles.kpiIcon} data-tone={KPI_TONES[index]}>
                <Icon size={22} aria-hidden />
              </span>
              <div className={styles.kpiContent}>
                <p>{kpi.label}</p>
                <strong>{kpi.value}</strong>
                <small>
                  <span>{kpi.trendValue}</span>
                  <b data-negative={kpi.trendDirection === "down"}>
                    {kpi.trendDirection === "down" ? <TrendingDown size={12} /> : <TrendingUp size={12} />}
                    {kpi.trendPct.replace("+", "")}
                  </b>
                </small>
              </div>
            </article>
          );
        })}
      </section>

      <section className={styles.primaryGrid}>
        <article className={styles.card}>
          <div className={styles.cardHeader}>
            <h2>
              {range.mode === "7d" ? "7日" : range.mode === "30d" ? "30日" : `${rangeBounds.days}日`}
              询盘与成交趋势{" "}
              <span title={granularity === "week" ? "按周汇总询盘数与成交数" : "按日统计询盘数与成交数"}>
                ⓘ
              </span>
            </h2>
            <div className={styles.chartControls}>
              <div className={styles.tabs} role="tablist" aria-label="趋势时间范围">
                <button
                  type="button"
                  role="tab"
                  aria-selected={range.mode === "7d"}
                  data-active={range.mode === "7d"}
                  onClick={() => {
                    setRange(defaultDateRange("7d"));
                    setGranularityOpen(false);
                  }}
                >
                  近7天
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={range.mode === "30d"}
                  data-active={range.mode === "30d"}
                  onClick={() => {
                    setRange(defaultDateRange("30d"));
                    setGranularityOpen(false);
                  }}
                >
                  近30天
                </button>
              </div>
              <div className={styles.granularityWrap} ref={granularityRef}>
                <button
                  type="button"
                  className={styles.granularity}
                  aria-expanded={granularityOpen}
                  aria-haspopup="listbox"
                  onClick={(event) => {
                    event.stopPropagation();
                    setGranularityOpen((open) => !open);
                  }}
                >
                  <span>{GRANULARITY_OPTIONS.find((item) => item.value === granularity)?.label}</span>
                  <ChevronDown size={14} aria-hidden />
                </button>
                {granularityOpen ? (
                  <ul className={styles.granularityMenu} role="listbox" aria-label="统计粒度">
                    {GRANULARITY_OPTIONS.map((option) => (
                      <li key={option.value}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={granularity === option.value}
                          data-active={granularity === option.value}
                          onClick={() => {
                            setGranularity(option.value);
                            setGranularityOpen(false);
                          }}
                        >
                          {option.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </div>
          </div>
          <div className={styles.chartPanel}>
            <MiniLineChart
              series={[
                { label: "询盘数", data: trend.inquiries, color: "#3b82f6" },
                { label: "成交数", data: trend.deals, color: "#22c55e" },
              ]}
              labels={trend.labels}
              width={720}
              height={300}
              showYAxis
              showValueLabels
            />
          </div>
        </article>

        <article className={styles.card}>
          <div className={styles.cardHeader}>
            <h2>销售团队排行</h2>
            <div className={styles.tabs}>
              <button data-active={rankingMetric === "amount"} onClick={() => setRankingMetric("amount")}>成交额</button>
              <button data-active={rankingMetric === "inquiries"} onClick={() => setRankingMetric("inquiries")}>询盘数</button>
              <button data-active={rankingMetric === "lost"} onClick={() => setRankingMetric("lost")}>丢单数</button>
            </div>
          </div>
          <div className={styles.rankingTable}>
            <div className={styles.rankingHead}>
              <span>排名</span>
              <span>销售</span>
              <span>
                {rankingMetric === "inquiries"
                  ? "询盘数"
                  : rankingMetric === "lost"
                    ? "丢单数"
                    : "成交额"}
              </span>
              <span>目标完成率</span>
              <span>较上月</span>
            </div>
            {salesRanking.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted-foreground">暂无销售排行数据</p>
            ) : (
              salesRanking.map((item) => (
                <div className={styles.rankingRow} key={item.name}>
                  <RankBadge rank={item.rank} />
                  <span className={styles.salesPerson}>
                    <span className={styles.avatar}>{item.avatar}</span><b>{item.name}</b>
                  </span>
                  <strong>{item.amount}</strong>
                  <span className={styles.targetRate}>
                    <i><em style={{ width: `${Math.max(12, item.targetRate * 2.2)}%` }} /></i>{item.targetRate}%
                  </span>
                  <b className={item.momDirection === "up" ? styles.up : styles.down}>
                    {item.momDirection === "up" ? "↑" : "↓"} {item.monthOverMonth.replace("+", "")}
                  </b>
                </div>
              ))
            )}
          </div>
        </article>
      </section>

      <section className={styles.secondaryGrid}>
        <article className={styles.card}>
          <div className={styles.cardHeader}>
            <h2>重点商机</h2>
            <Link href="/dashboard/inquiries">查看全部</Link>
          </div>
          <div className={styles.opportunityWrap}>
            {hotOpportunities.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted-foreground">暂无重点商机</p>
            ) : (
              <table className={styles.opportunityTable}>
                <thead><tr><th>客户公司</th><th>来源渠道</th><th>意向等级</th><th>当前阶段</th><th>负责人</th><th>下一步跟进</th></tr></thead>
                <tbody>
                  {hotOpportunities.map((item) => (
                    <tr key={item.id}>
                      <td><Link href={`/dashboard/inquiries/${item.id}`}>{item.company}</Link></td>
                      <td>{item.channel}</td>
                      <td><IntentFlames count={item.intentStars} /></td>
                      <td>{item.stage}</td>
                      <td><span className={styles.owner}><UserRound size={13} />{item.owner}</span></td>
                      <td><b>{item.nextStep}</b><small>{item.updatedAt}</small></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </article>

        <article className={styles.card}>
          <div className={styles.cardHeader}><h2>来源渠道分布</h2></div>
          <div className={styles.channelBody}>
            {channelDistribution.length === 0 ? (
              <p className="text-sm text-muted-foreground">暂无渠道数据</p>
            ) : (
              <>
                <div className={styles.donut} style={{ background: channelGradient }}>
                  <div><strong>{totalChannels}</strong><span>总询盘数</span></div>
                </div>
                <ul className={styles.channelLegend}>
                  {channelDistribution.map((item) => (
                    <li key={item.label}>
                      <i style={{ backgroundColor: item.color }} />
                      <span>{item.label}</span>
                      <b>{item.value} ({((item.value / totalChannels) * 100).toFixed(1)}%)</b>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
          <Link href="/dashboard/reports/channel" className={styles.channelLink}>查看渠道分析 <ChevronRight size={14} /></Link>
        </article>

        <article className={styles.card}>
          <div className={styles.cardHeader}><h2>管理提醒</h2></div>
          <ul className={styles.alertList}>
            {managementAlerts.map((item, index) => {
              const Icon = ALERT_ICONS[index];
              return (
                <li key={item.id}>
                  <Link href={item.actionHref ?? "#"}>
                    <span className={styles.alertIcon} data-tone={ALERT_TONES[index]}><Icon size={19} /></span>
                    <span><b>{item.title}</b><small>{item.description}</small></span>
                    <strong>{item.count}</strong><ChevronRight size={15} />
                  </Link>
                </li>
              );
            })}
          </ul>
        </article>
      </section>
    </div>
  );
}
