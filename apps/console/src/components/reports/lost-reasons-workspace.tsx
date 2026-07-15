"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Download,
  Hourglass,
  MinusCircle,
  PieChart,
  RefreshCw,
  Search,
  UserCheck,
} from "lucide-react";

import { Badge, Button, PageHeader, Skeleton, StatCard } from "@qiyun/ui";

import { ConsoleDataModeBanner } from "@/components/console/console-data-mode-banner";
import { ConsolePage, ConsolePageAlerts } from "@/components/console/console-page-shell";
import { ConsoleRequestError } from "@/components/console/console-request-error";
import {
  loadLostReasonsReport,
  type LostReasonRow,
  type LostReasonShare,
} from "@/lib/reports/lost-reasons-data";

const FALLBACK_SHARE: LostReasonShare[] = [
  { name: "价格过高", value: 28, pct: 32.6, color: "#3b5eff" },
  { name: "需求变更", value: 22, pct: 25.6, color: "#22c55e" },
  { name: "竞品胜出", value: 14, pct: 16.3, color: "#f97316" },
  { name: "项目暂停", value: 12, pct: 14.0, color: "#8b5cf6" },
  { name: "响应不足", value: 10, pct: 11.6, color: "#ec4899" },
  { name: "其他原因", value: 3, pct: 3.5, color: "#94a3b8" },
];

const FALLBACK_ROWS: LostReasonRow[] = [
  { id: "INQ-20240628", company: "宁波恒威进出口", stage: "方案阶段", stageTone: "orange", reason: "价格过高", amount: 86000, owner: "王磊", date: "2024-06-28", action: "提供阶梯报价方案" },
  { id: "INQ-20240627", company: "深圳前海科技公司", stage: "谈判对比", stageTone: "yellow", reason: "竞品胜出", amount: 142000, owner: "李娜", date: "2024-06-27", action: "强化差异化价值对比" },
  { id: "INQ-20240626", company: "广州远途贸易", stage: "方案阶段", stageTone: "orange", reason: "需求变更", amount: 58000, owner: "张伟", date: "2024-06-26", action: "重新梳理需求清单" },
];

const STAGE_FUNNEL = [
  { label: "初步沟通", value: 458, color: "#3b5eff", lost: false },
  { label: "需求确认", value: 236, color: "#06b6d4", lost: false },
  { label: "方案/报价", value: 128, color: "#22c55e", lost: false },
  { label: "谈判/对比", value: 86, color: "#f97316", lost: false },
  { label: "丢单", value: 86, color: "#ef4444", lost: true },
];

function fmt(n: number): string {
  return n.toLocaleString("zh-CN");
}

function LostDonut({ shares }: { shares: LostReasonShare[] }) {
  const r = 52;
  const circ = 2 * Math.PI * r;
  const total = shares.reduce((s, x) => s + x.value, 0) || 1;
  let offset = 0;
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className="relative h-40 w-40 shrink-0">
        <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90">
          <circle cx="70" cy="70" r={r} fill="none" stroke="#f1f5f9" strokeWidth="18" />
          {shares.map((s) => {
            const dash = (s.value / total) * circ;
            const el = (
              <circle
                key={s.name}
                cx="70"
                cy="70"
                r={r}
                fill="none"
                stroke={s.color}
                strokeWidth="18"
                strokeDasharray={`${dash} ${circ - dash}`}
                strokeDashoffset={-offset}
              />
            );
            offset += dash;
            return el;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold text-foreground">{total}</span>
          <span className="text-xs text-muted-foreground">丢单总数</span>
        </div>
      </div>
      <ul className="flex-1 space-y-1.5 text-sm">
        {shares.map((s) => (
          <li key={s.name} className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 truncate">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: s.color }} />
              {s.name}
            </span>
            <span className="tabular-nums text-muted-foreground">
              {s.value} · {s.pct}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function StageFunnel({ lostTotal }: { lostTotal: number }) {
  const funnel = STAGE_FUNNEL.map((step, index) =>
    index === STAGE_FUNNEL.length - 1 ? { ...step, value: lostTotal || step.value } : step,
  );
  const max = funnel[0]?.value || 1;
  return (
    <div className="space-y-1">
      {funnel.map((s, i) => {
        const width = Math.max(20, (s.value / max) * 100);
        const next = funnel[i + 1]?.value ?? s.value * 0.8;
        const nextWidth = Math.max(16, (next / max) * 100);
        return (
          <div key={s.label} className="flex items-center gap-3">
            <div className="w-20 shrink-0 text-right text-xs text-muted-foreground">{s.label}</div>
            <div className="relative h-9 flex-1">
              <div
                className="absolute left-1/2 top-0 h-full -translate-x-1/2 rounded-md"
                style={{
                  width: `${width}%`,
                  background: `linear-gradient(90deg, ${s.color}cc, ${s.color})`,
                  clipPath: `polygon(${(100 - width) / 2}% 0, ${100 - (100 - width) / 2}% 0, ${100 - (100 - nextWidth) / 2}% 100%, ${(100 - nextWidth) / 2}% 100%)`,
                }}
              />
            </div>
            <div className="w-24 shrink-0 text-right">
              <span className={`tabular-nums font-medium ${s.lost ? "text-destructive" : "text-foreground"}`}>
                {fmt(s.value)}
              </span>
              <span className="ml-1 text-xs text-muted-foreground">
                {((s.value / max) * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function LostReasonsWorkspace() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPreview, setIsPreview] = useState(true);
  const [shares, setShares] = useState<LostReasonShare[]>(FALLBACK_SHARE);
  const [rows, setRows] = useState<LostReasonRow[]>(FALLBACK_ROWS);
  const [totalLost, setTotalLost] = useState(FALLBACK_SHARE.reduce((s, x) => s + x.value, 0));

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const report = await loadLostReasonsReport();
      if (report.totalLost > 0) {
        setShares(report.shares.length ? report.shares : FALLBACK_SHARE);
        setRows(report.rows.length ? report.rows : FALLBACK_ROWS);
        setTotalLost(report.totalLost);
        setIsPreview(false);
      } else {
        setShares(FALLBACK_SHARE);
        setRows(FALLBACK_ROWS);
        setTotalLost(FALLBACK_SHARE.reduce((s, x) => s + x.value, 0));
        setIsPreview(true);
      }
    } catch {
      setShares(FALLBACK_SHARE);
      setRows(FALLBACK_ROWS);
      setTotalLost(FALLBACK_SHARE.reduce((s, x) => s + x.value, 0));
      setIsPreview(true);
      setError("加载丢单数据失败，已展示预览数据。");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const topReasonPct = shares[0]?.pct ?? 0;
  const topTwoPct = shares.slice(0, 2).reduce((sum, item) => sum + item.pct, 0);

  const insights = useMemo(
    () => [
      {
        icon: "⚠️",
        title: "高频丢单原因",
        body:
          shares.length >= 2
            ? `${shares[0]?.name}与${shares[1]?.name}是主要丢单原因，合计占比 ${topTwoPct.toFixed(1)}%。`
            : "暂无足够丢单样本，请先积累报价跟进记录。",
      },
      {
        icon: "📊",
        title: "趋势变化",
        body: isPreview
          ? "当前为预览数据，接入真实报价后将展示趋势对比。"
          : `首要原因「${shares[0]?.name ?? "—"}」占比 ${topReasonPct.toFixed(1)}%。`,
      },
      {
        icon: "🔄",
        title: "可挽回机会",
        body: `约 ${Math.max(1, Math.round(totalLost * 0.3))} 个客户存在跟进挽回空间，建议复盘后主动回访。`,
      },
      {
        icon: "✅",
        title: "优化建议",
        body: "针对价格与交期类丢单，优化报价策略；针对响应不足，缩短首次回复时长并明确跟进责任人。",
      },
    ],
    [shares, topReasonPct, topTwoPct, totalLost, isPreview],
  );

  const kpis = useMemo(
    (): Array<{
      icon: ReactNode;
      tone: "brand" | "success" | "purple" | "warning" | "info";
      label: string;
      value: string;
      trend: string | null;
      desc?: string;
      up: boolean;
    }> => [
      { icon: <MinusCircle />, tone: "warning", label: "丢单总数", value: String(totalLost), trend: null, up: false },
      {
        icon: <PieChart />,
        tone: "warning",
        label: "首要原因占比",
        value: `${topReasonPct.toFixed(1)}%`,
        trend: null,
        up: false,
      },
      {
        icon: <Hourglass />,
        tone: "purple",
        label: "前两项合计",
        value: `${topTwoPct.toFixed(1)}%`,
        trend: null,
        up: true,
      },
      {
        icon: <UserCheck />,
        tone: "success",
        label: "可跟进记录",
        value: String(rows.length),
        trend: null,
        desc: isPreview ? "预览数据" : "来自报价丢单",
        up: true,
      },
    ],
    [totalLost, topReasonPct, topTwoPct, rows.length, isPreview],
  );

  return (
    <ConsolePage>
      <PageHeader
        title="丢单原因分析"
        actions={
          <>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                placeholder="搜索..."
                className="h-9 w-44 rounded-control border border-border bg-card pl-8 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <Button variant="outline" size="sm" onClick={() => void load()}>
              <RefreshCw className="h-4 w-4" /> 刷新
            </Button>
            <Button variant="default" size="sm">
              <Download className="h-4 w-4" /> 导出
            </Button>
          </>
        }
      />

      <ConsolePageAlerts>
        <ConsoleDataModeBanner feature="丢单原因分析" />
        {error ? <ConsoleRequestError message={error} onRetry={() => void load()} /> : null}
        {loading ? (
          <div className="grid gap-3 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-28 rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-4 ui-stagger-fade-in ui-hover-lift-children">
            {kpis.map((k) => (
              <StatCard
                key={k.label}
                label={k.label}
                value={k.value}
                description={k.desc}
                icon={k.icon}
                iconTone={k.tone}
                trend={
                  k.trend ? (
                    <span className={`text-xs font-medium ${k.up ? "text-success" : "text-destructive"}`}>
                      {k.up ? "▲" : "▼"} {k.trend}
                    </span>
                  ) : undefined
                }
              />
            ))}
          </div>
        )}
      </ConsolePageAlerts>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <section className="rounded-card border border-border bg-card p-5 shadow-card">
          <h3 className="mb-4 text-base font-semibold text-foreground">丢单原因分布</h3>
          <LostDonut shares={shares} />
        </section>

        <section className="rounded-card border border-border bg-card p-5 shadow-card">
          <h3 className="mb-4 text-base font-semibold text-foreground">丢单阶段漏斗</h3>
          <StageFunnel lostTotal={totalLost} />
        </section>

        <section className="rounded-card border border-border bg-card p-5 shadow-card">
          <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-foreground">
            <span className="text-lg">🤖</span> AI 洞察与建议
          </h3>
          <div className="space-y-2.5">
            {insights.map((it) => (
              <div key={it.title} className="rounded-control border border-border bg-accent/30 p-3">
                <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                  <span>{it.icon}</span> {it.title}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{it.body}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="rounded-card border border-border bg-card p-5 shadow-card">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold text-foreground">代表性丢单询盘</h3>
          <Badge variant="outline">
            共 {rows.length} 条{isPreview ? "（预览）" : ""}
          </Badge>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-3 py-2 font-medium">询盘编号</th>
                <th className="px-3 py-2 font-medium">客户公司</th>
                <th className="px-3 py-2 font-medium">所处阶段</th>
                <th className="px-3 py-2 font-medium">丢单原因</th>
                <th className="px-3 py-2 text-right font-medium">丢单金额(元)</th>
                <th className="px-3 py-2 font-medium">业务员</th>
                <th className="px-3 py-2 font-medium">丢单时间</th>
                <th className="px-3 py-2 font-medium">建议行动</th>
                <th className="px-3 py-2 text-right font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-border/60 hover:bg-accent/40">
                  <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{r.id}</td>
                  <td className="px-3 py-2.5 font-medium text-foreground">{r.company}</td>
                  <td className="px-3 py-2.5">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        r.stageTone === "orange"
                          ? "bg-orange-100 text-orange-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {r.stage}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">{r.reason}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">¥{fmt(r.amount)}</td>
                  <td className="px-3 py-2.5">{r.owner}</td>
                  <td className="px-3 py-2.5 tabular-nums text-muted-foreground">{r.date}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{r.action}</td>
                  <td className="px-3 py-2.5 text-right">
                    <button type="button" className="text-xs text-primary hover:underline">
                      详情
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </ConsolePage>
  );
}
