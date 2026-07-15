"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  BellRing,
  CalendarDays,
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

type DateRangeMode = "7d" | "30d" | "custom";

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

  const today = new Date().toISOString().slice(0, 10);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const [range, setRange] = useState<{ mode: DateRangeMode; from: string; to: string }>({
    mode: "7d",
    from: sevenDaysAgo,
    to: today,
  });
  const [pickerOpen, setPickerOpen] = useState(false);
  const [rankingMetric, setRankingMetric] = useState<"amount" | "inquiries" | "lost">("amount");

  const rangeBounds = useMemo(() => {
    if (range.mode === "7d") return { from: sevenDaysAgo, to: today, days: 7, label: "近7天" };
    if (range.mode === "30d") return { from: thirtyDaysAgo, to: today, days: 30, label: "近30天" };
    const days = Math.max(7, Math.ceil((Date.parse(range.to) - Date.parse(range.from)) / 86400000) + 1);
    return { from: range.from, to: range.to, days, label: `${range.from} ~ ${range.to}` };
  }, [range, today, sevenDaysAgo, thirtyDaysAgo]);

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
  const trend = useMemo(
    () =>
      isPreview
        ? { labels: TREND_7D_LABELS, inquiries: TREND_7D_INQUIRIES, deals: TREND_7D_DEALS }
        : mapTrendSeries(snapshot, rangeBounds.days as 7 | 30, overview),
    [isPreview, snapshot, rangeBounds.days, overview],
  );
  const salesRanking = useMemo(
    () => (isPreview ? SALES_RANKING : mapSalesRanking(filteredInquiries)),
    [isPreview, filteredInquiries],
  );
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
        <div className={styles.datePicker}>
          <button
            type="button"
            className={styles.dateButton}
            onClick={() => setPickerOpen((open) => !open)}
            aria-expanded={pickerOpen}
            aria-haspopup="true"
          >
            <CalendarDays size={17} aria-hidden />
            <span>{rangeBounds.label}</span>
            <ChevronDown size={16} className={styles.chevron} aria-hidden />
          </button>
          {pickerOpen ? (
            <div className={styles.datePickerPanel}>
              <div className={styles.presetList}>
                <button
                  type="button"
                  className={range.mode === "7d" ? styles.presetActive : styles.preset}
                  onClick={() => {
                    setRange({ mode: "7d", from: sevenDaysAgo, to: today });
                    setPickerOpen(false);
                  }}
                >
                  近7天
                </button>
                <button
                  type="button"
                  className={range.mode === "30d" ? styles.presetActive : styles.preset}
                  onClick={() => {
                    setRange({ mode: "30d", from: thirtyDaysAgo, to: today });
                    setPickerOpen(false);
                  }}
                >
                  近30天
                </button>
                <button
                  type="button"
                  className={range.mode === "custom" ? styles.presetActive : styles.preset}
                  onClick={() => setRange((r) => ({ ...r, mode: "custom" }))}
                >
                  自定义
                </button>
              </div>
              {range.mode === "custom" ? (
                <div className={styles.customRange}>
                  <label>
                    开始日期
                    <input
                      type="date"
                      value={range.from}
                      max={range.to}
                      onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
                    />
                  </label>
                  <label>
                    结束日期
                    <input
                      type="date"
                      value={range.to}
                      min={range.from}
                      onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
                    />
                  </label>
                </div>
              ) : null}
              <div className={styles.pickerActions}>
                <button
                  type="button"
                  className={styles.pickerReset}
                  onClick={() => {
                    setRange({ mode: "7d", from: sevenDaysAgo, to: today });
                    setPickerOpen(false);
                  }}
                >
                  重置
                </button>
                <button
                  type="button"
                  className={styles.pickerConfirm}
                  onClick={() => setPickerOpen(false)}
                >
                  确定
                </button>
              </div>
            </div>
          ) : null}
        </div>
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
                <Icon size={24} aria-hidden />
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
            <h2>{rangeBounds.label}询盘与成交趋势 <span title="统计口径说明">ⓘ</span></h2>
          </div>
          <div className={styles.chartPanel}>
            <MiniLineChart
              series={[
                { label: "询盘数", data: trend.inquiries, color: "#2468f2" },
                { label: "成交数", data: trend.deals, color: "#15aa5d" },
              ]}
              labels={trend.labels}
              width={680}
              height={230}
              showYAxis
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
              <span>排名</span><span>销售</span><span>成交额</span><span>目标完成率</span><span>较上月</span>
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
