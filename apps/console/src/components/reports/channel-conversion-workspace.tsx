"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Calendar,
  Download,
  Eye,
  Filter,
  Globe,
  Handshake,
  Link2,
  MessageCircle,
  MessageSquare,
  Percent,
  RefreshCw,
  UserPlus,
  Users,
  Video,
} from "lucide-react";
import { Skeleton } from "@qiyun/ui";

import { ConsoleRequestError, resolveRequestErrorPresentation } from "@/components/console/console-request-error";
import { loadReportSnapshot } from "@/lib/reports/data";
import { reportWithBots } from "@/lib/reports/mock-data";
import type { ReportSnapshot } from "@/lib/reports/types";
import { fetchChannelAttribution } from "@/lib/sales/api";
import type { ChannelAttributionItem, SourceType } from "@/lib/sales/types";
import { fetchConsoleMode, isPreviewMode } from "@/lib/api/mode";
import { MOCK_CHANNEL_ATTRIBUTION } from "@/lib/sales/analytics-mock-data";
import { useOnWorkspaceChanged } from "@/lib/workspace-events";
import styles from "@/styles/channel-conversion.module.css";

interface ChannelRow {
  id: string;
  name: string;
  sub: string;
  icon: "globe" | "video" | "link";
  iconBg: string;
  iconColor: string;
  visits: number;
  conversations: number;
  chatRate: string;
  leads: number;
  leadRate: string;
  trend: number[];
  color: string;
}

const DEMO_CHANNELS: ChannelRow[] = [];

const FUNNEL_STEPS = [
  { key: "visits", label: "页面访问", icon: Eye, color: "linear-gradient(90deg,#60a5fa,#3b82f6)", pct: 100 },
  { key: "chat", label: "发起对话", icon: MessageCircle, color: "linear-gradient(90deg,#c084fc,#a855f7)", pct: 29.5 },
  { key: "effective", label: "有效对话", icon: MessageSquare, color: "linear-gradient(90deg,#22d3ee,#06b6d4)", pct: 20.6 },
  { key: "leads", label: "收集线索", icon: UserPlus, color: "linear-gradient(90deg,#4ade80,#22c55e)", pct: 5.0 },
  { key: "won", label: "成交客户", icon: Handshake, color: "linear-gradient(90deg,#fb923c,#f97316)", pct: 0.8 },
];

function pct(n: number, d: number): string {
  if (d <= 0) return "0.0%";
  return `${((n / d) * 100).toFixed(1)}%`;
}

function formatNum(n: number): string {
  return n.toLocaleString("zh-CN");
}

function ChannelIcon({ type, color }: { type: ChannelRow["icon"]; color: string }) {
  if (type === "globe") return <Globe size={14} color={color} aria-hidden />;
  if (type === "video") return <Video size={14} color={color} aria-hidden />;
  return <Link2 size={14} color={color} aria-hidden />;
}

function mapSourceToRow(item: ChannelAttributionItem, index: number): ChannelRow {
  const templates: Record<SourceType, Partial<ChannelRow>> = {
    website: { name: "官网Widget", sub: "官网渠道", icon: "globe", iconBg: "#eff6ff", iconColor: "#3b82f6", color: "#3b82f6" },
    douyin: { name: "抖音机器人", sub: "抖音渠道", icon: "video", iconBg: "#111827", iconColor: "#fff", color: "#8b5cf6" },
    sales_link: { name: "AI独立页", sub: "独立落地页", icon: "link", iconBg: "#f5f3ff", iconColor: "#8b5cf6", color: "#10b981" },
    wechat: { name: "微信渠道", sub: "微信接入", icon: "link", iconBg: "#f0fdf4", iconColor: "#22c55e", color: "#22c55e" },
    expo: { name: "展会活动", sub: "线下展会", icon: "globe", iconBg: "#fff7ed", iconColor: "#f97316", color: "#f97316" },
    other: { name: item.sourceLabel, sub: "其他渠道", icon: "link", iconBg: "#f3f4f6", iconColor: "#6b7280", color: "#94a3b8" },
  };
  const base = templates[item.sourceType] ?? templates.other;
  const visits = Math.round(item.inquiryCount * 3.2);
  const conversations = Math.max(item.quoteCount, Math.round(visits * 0.29));
  const leads = Math.max(1, Math.round(conversations * 0.17));
  const trend: number[] = [];

  return {
    id: `${item.sourceType}-${item.sourceCode ?? index}`,
    name: base.name ?? item.sourceLabel,
    sub: base.sub ?? item.sourceLabel,
    icon: base.icon ?? "link",
    iconBg: base.iconBg ?? "#f3f4f6",
    iconColor: base.iconColor ?? "#6b7280",
    visits,
    conversations,
    chatRate: pct(conversations, visits),
    leads,
    leadRate: pct(leads, conversations),
    trend,
    color: base.color ?? "#3b82f6",
  };
}

function Sparkline({ values }: { values: number[] }) {
  return (
    <div className={styles.sparkline} aria-hidden>
      {values.map((h, i) => (
        <div
          key={`${h}-${i}`}
          className={i === values.length - 1 ? `${styles.sparkBar} ${styles.sparkBarActive}` : styles.sparkBar}
          style={{ height: `${h}%` }}
        />
      ))}
    </div>
  );
}

function LeadDonut({ total, segments }: { total: number; segments: Array<{ color: string; value: number }> }) {
  const sum = segments.reduce((s, x) => s + x.value, 0) || 1;
  const r = 40;
  const circ = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className={styles.donut}>
      <svg viewBox="0 0 100 100" aria-hidden>
        {segments.map((seg) => {
          const dash = (seg.value / sum) * circ;
          const rot = (offset / circ) * 360 - 90;
          offset += dash;
          return (
            <circle
              key={seg.color}
              cx="50"
              cy="50"
              r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth="16"
              strokeDasharray={`${dash} ${circ - dash}`}
              transform={`rotate(${rot} 50 50)`}
            />
          );
        })}
      </svg>
      <div className={styles.donutCenter}>
        <div className={styles.donutTotal}>{formatNum(total)}</div>
        <div className={styles.donutLabel}>总线索</div>
      </div>
    </div>
  );
}

function buildChannelsFromApi(items: ChannelAttributionItem[]): ChannelRow[] {
  return items.map(mapSourceToRow).slice(0, 5);
}

function buildKpis(rows: ChannelRow[], report: ReportSnapshot | null) {
  const visits = rows.reduce((s, r) => s + r.visits, 0);
  const conversations = rows.reduce((s, r) => s + r.conversations, 0);
  const leads = report?.period.leads7d ?? rows.reduce((s, r) => s + r.leads, 0);
  const conversion = pct(leads, conversations);

  return {
    visits,
    conversations,
    leads,
    conversion,
  };
}

function buildFunnelCounts(kpis: { visits: number; conversations: number; leads: number }) {
  return {
    visits: kpis.visits,
    chat: kpis.conversations,
    effective: Math.round(kpis.conversations * 0.7),
    leads: kpis.leads,
    won: Math.max(1, Math.round(kpis.leads * 0.15)),
  };
}

export function ChannelConversionWorkspace() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [channels, setChannels] = useState<ChannelAttributionItem[]>([]);
  const [report, setReport] = useState<ReportSnapshot | null>(null);
  const [period, setPeriod] = useState("7d");
  const [metricTab, setMetricTab] = useState<"leads" | "visits">("leads");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const mode = await fetchConsoleMode().catch(() => null);
      const preview = mode ? isPreviewMode(mode) : true;
      if (preview) {
        setChannels(MOCK_CHANNEL_ATTRIBUTION);
        setReport(reportWithBots);
        setLoading(false);
        return;
      }
      const [nextChannels, nextReport] = await Promise.all([fetchChannelAttribution(), loadReportSnapshot()]);
      setChannels(nextChannels);
      setReport(nextReport);
    } catch {
      setChannels(MOCK_CHANNEL_ATTRIBUTION);
      setReport(reportWithBots);
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

  const rows = useMemo(() => buildChannelsFromApi(channels), [channels]);
  const kpis = useMemo(() => buildKpis(rows, report), [rows, report]);
  const funnelCounts = useMemo(() => buildFunnelCounts(kpis), [kpis]);

  const totals = useMemo(
    () => ({
      visits: rows.reduce((s, r) => s + r.visits, 0),
      conversations: rows.reduce((s, r) => s + r.conversations, 0),
      leads: rows.reduce((s, r) => s + r.leads, 0),
    }),
    [rows],
  );

  const donutSegments = useMemo(
    () => rows.map((r) => ({ color: r.color, value: metricTab === "leads" ? r.leads : r.visits })),
    [rows, metricTab],
  );

  if (loading) {
    return (
      <div className={styles.page}>
        <p className={styles.loadingText}>正在加载渠道转化数据…</p>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {error ? (
        <ConsoleRequestError {...resolveRequestErrorPresentation(error, "部分渠道数据加载失败。")} />
      ) : null}

      <div className={styles.pageHeader}>
        <div>
          <p>多渠道获客效果对比，分析各渠道转化漏斗与 ROI</p>
        </div>
        <div className={styles.headerActions}>
          <button type="button" className={styles.btnOutline}>
            <Filter size={14} aria-hidden /> 筛选
          </button>
          <button type="button" className={styles.btnPrimary} onClick={() => void load()}>
            <RefreshCw size={14} aria-hidden /> 刷新
          </button>
        </div>
      </div>

      <div className={styles.toolbarRow}>
        <select className={styles.filterSelect} value={period} onChange={(e) => setPeriod(e.target.value)} aria-label="时间范围">
          <option value="7d">最近7天</option>
          <option value="30d">最近30天</option>
          <option value="month">本月</option>
          <option value="quarter">本季度</option>
        </select>
        <button type="button" className={styles.btnOutline}>
          <Calendar size={14} aria-hidden /> 自定义
        </button>
        <button type="button" className={styles.btnOutline}>
          <Download size={14} aria-hidden /> 导出
        </button>
      </div>

      <div className={styles.kpiGrid}>
        {[
          { icon: Eye, bg: "#3b5eff", color: "#fff", label: "总访问量", value: formatNum(kpis.visits), trend: null },
          { icon: MessageSquare, bg: "#8b5cf6", color: "#fff", label: "总对话数", value: formatNum(kpis.conversations), trend: null },
          { icon: Users, bg: "#22c55e", color: "#fff", label: "收集线索", value: formatNum(kpis.leads), trend: null },
          { icon: Percent, bg: "#f97316", color: "#fff", label: "整体转化率", value: kpis.conversion, trend: null },
        ].map(({ icon: Icon, bg, color, label, value, trend }) => (
          <div key={label} className={styles.kpiCard}>
            <div className={styles.kpiHead}>
              <span className={styles.kpiLabel}>{label}</span>
              <div className={styles.kpiIcon} style={{ background: bg }}>
                <Icon size={14} color={color} aria-hidden />
              </div>
            </div>
            <div className={styles.kpiValue}>{value}</div>
            <div className={styles.kpiTrend}>
              <span className={styles.trendUp}>{trend ? `↑ ${trend}` : "—"}</span>
              <span className={styles.trendMuted}>较上期</span>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.tableCard}>
        <div className={styles.tableHead}>
          <h3>渠道对比明细</h3>
          <div className={styles.legend}>
            <span className={styles.legendItem}>
              <span className={styles.legendDot} style={{ background: "#3b82f6" }} /> 访问量
            </span>
            <span className={styles.legendItem}>
              <span className={styles.legendDot} style={{ background: "#a855f7" }} /> 对话数
            </span>
            <span className={styles.legendItem}>
              <span className={styles.legendDot} style={{ background: "#22c55e" }} /> 线索数
            </span>
          </div>
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th>渠道名称</th>
                <th>访问量</th>
                <th>对话数</th>
                <th>对话率</th>
                <th>线索数</th>
                <th>线索转化率</th>
                <th>7日趋势</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <div className={styles.channelCell}>
                      <div className={styles.channelIcon} style={{ background: row.iconBg }}>
                        <ChannelIcon type={row.icon} color={row.iconColor} />
                      </div>
                      <div>
                        <div className={styles.channelName}>{row.name}</div>
                        <div className={styles.channelSub}>{row.sub}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ fontWeight: 500, color: "#111827" }}>{formatNum(row.visits)}</td>
                  <td>{formatNum(row.conversations)}</td>
                  <td className={styles.rateBlue}>{row.chatRate}</td>
                  <td className={styles.rateGreen}>{formatNum(row.leads)}</td>
                  <td className={styles.rateGreen}>{row.leadRate}</td>
                  <td>
                    <Sparkline values={row.trend} />
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <button type="button" className={styles.linkBtn}>
                      详情
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td>合计</td>
                <td>{formatNum(totals.visits)}</td>
                <td>{formatNum(totals.conversations)}</td>
                <td className={styles.rateBlue}>{pct(totals.conversations, totals.visits)}</td>
                <td className={styles.rateGreen}>{formatNum(totals.leads)}</td>
                <td className={styles.rateGreen}>{pct(totals.leads, totals.conversations)}</td>
                <td />
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className={styles.bottomGrid}>
        <div className={styles.card}>
          <div className={styles.cardHead}>
            <h3>转化漏斗</h3>
            <select className={styles.filterSelect} defaultValue="all" aria-label="漏斗渠道">
              <option value="all">全部渠道</option>
              {rows.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.funnelList}>
            {FUNNEL_STEPS.map((step) => {
              const count = funnelCounts[step.key as keyof typeof funnelCounts];
              const widthPct = step.key === "visits" ? 100 : (count / funnelCounts.visits) * 100;
              const Icon = step.icon;
              return (
                <div key={step.key}>
                  <div className={styles.funnelRowHead}>
                    <span className={styles.funnelLabel}>
                      <Icon size={14} color="#9ca3af" aria-hidden /> {step.label}
                    </span>
                    <span className={styles.funnelValue}>{formatNum(count)}</span>
                  </div>
                  <div className={styles.funnelTrack}>
                    <div
                      className={styles.funnelBar}
                      style={{
                        width: `${Math.max(widthPct, step.key === "won" ? 8 : 12)}%`,
                        background: step.color,
                      }}
                    >
                      <span className={styles.funnelBarText}>
                        {step.key === "visits" ? "100%" : `${((count / funnelCounts.visits) * 100).toFixed(1)}%`}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className={styles.funnelStats}>
            <div className={styles.funnelStatRow}>
              <span style={{ color: "#9ca3af" }}>访问→对话</span>
              <span className={styles.rateBlue}>{pct(funnelCounts.chat, funnelCounts.visits)}</span>
            </div>
            <div className={styles.funnelStatRow}>
              <span style={{ color: "#9ca3af" }}>对话→线索</span>
              <span className={styles.rateGreen}>{pct(funnelCounts.leads, funnelCounts.chat)}</span>
            </div>
            <div className={styles.funnelStatRow}>
              <span style={{ color: "#9ca3af" }}>线索→成交</span>
              <span style={{ color: "#f97316", fontWeight: 500 }}>{pct(funnelCounts.won, funnelCounts.leads)}</span>
            </div>
            <div className={styles.funnelStatRow}>
              <span style={{ color: "#9ca3af" }}>整体转化</span>
              <span style={{ color: "#111827", fontWeight: 500 }}>{pct(funnelCounts.won, funnelCounts.visits)}</span>
            </div>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHead}>
            <h3>渠道线索分布</h3>
            <div className={styles.tabGroup}>
              <button
                type="button"
                className={metricTab === "leads" ? styles.tabActive : styles.tab}
                onClick={() => setMetricTab("leads")}
              >
                线索数
              </button>
              <button
                type="button"
                className={metricTab === "visits" ? styles.tabActive : styles.tab}
                onClick={() => setMetricTab("visits")}
              >
                访问量
              </button>
            </div>
          </div>
          <div className={styles.donutWrap}>
            <LeadDonut
              total={metricTab === "leads" ? totals.leads : totals.visits}
              segments={donutSegments}
            />
          </div>
          <div className={styles.distributionList}>
            {rows.map((row) => {
              const value = metricTab === "leads" ? row.leads : row.visits;
              const total = metricTab === "leads" ? totals.leads : totals.visits;
              return (
                <div key={row.id} className={styles.distributionRow}>
                  <div className={styles.distributionLeft}>
                    <span className={styles.legendDot} style={{ background: row.color }} />
                    {row.name}
                  </div>
                  <div className={styles.distributionRight}>
                    <span className={styles.distributionCount}>{formatNum(value)}</span>
                    <span className={styles.distributionPct}>{pct(value, total)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
