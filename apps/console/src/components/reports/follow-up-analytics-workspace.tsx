"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  Download,
  Info,
  Phone,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import { Badge, Button, PageHeader, Skeleton, StatCard } from "@qiyun/ui";

import { DataCenterToolbar } from "@/components/data-center/data-center-toolbar";
import {
  defaultDateRange,
  resolveDateRangeBounds,
  type DateRangeValue,
} from "@/components/ui/date-range-picker";
import { ConsoleDataModeBanner } from "@/components/console/console-data-mode-banner";
import { ConsolePage, ConsolePageAlerts } from "@/components/console/console-page-shell";
import { ConsoleRequestError } from "@/components/console/console-request-error";
import { listCalendarEventsFromApi } from "@/lib/calendar/api";
import type { CalendarEvent } from "@/lib/calendar/types";
import { fetchConsoleMode, isPreviewMode } from "@/lib/api/mode";
import {
  buildFollowUpKpis,
  buildFollowUpMethods,
  buildFollowUpRecords,
  buildFollowUpResults,
  buildFollowUpStageConversion,
  buildFollowUpTimeliness,
  buildFollowUpTopSales,
  buildFollowUpTrend,
} from "@/lib/reports/follow-up-analytics-helpers";
import {
  FOLLOW_UP_KPIS,
  FOLLOW_UP_METHODS,
  FOLLOW_UP_RECORDS,
  FOLLOW_UP_RESULTS,
  FOLLOW_UP_STAGE_CONVERSION,
  FOLLOW_UP_TIMELINESS,
  FOLLOW_UP_TOP_SALES,
  FOLLOW_UP_TREND,
} from "@/lib/reports/follow-up-analytics-mock";
import {
  fetchConversionFunnel,
  fetchSalesOverview,
  listInquiries,
} from "@/lib/sales/api";
import type { ConversionFunnelStep, InquiryListItem, SalesOverviewMetrics } from "@/lib/sales/types";
import { useOnWorkspaceChanged } from "@/lib/workspace-events";

const PAGE_SIZE = 8;

function formatDateRange(from: Date, to: Date): string {
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return `${fmt(from)} ~ ${fmt(to)}`;
}

function TrendText({ value, positive = true }: { value: string; positive?: boolean }) {
  const isDown = value.startsWith("-");
  return (
    <span className={`text-xs font-medium ${isDown ? "text-emerald-600" : positive ? "text-emerald-600" : "text-red-600"}`}>
      {value === "—" ? "统计周期 —" : `较上月 ${value}`}
    </span>
  );
}

function MiniLineChart({
  points,
}: {
  points: Array<{ label: string; total: number; effective: number; newCustomers: number }>;
}) {
  if (!points.length) {
    return <p className="py-10 text-center text-sm text-muted-foreground">暂无趋势数据</p>;
  }
  const max = Math.max(...points.map((d) => d.total), 1);
  return (
    <div className="flex h-48 items-end gap-2 pt-4">
      {points.map((point) => (
        <div key={point.label} className="flex flex-1 flex-col items-center gap-1">
          <div className="flex w-full items-end justify-center gap-0.5" style={{ height: 140 }}>
            <div
              className="w-2 rounded-t bg-blue-200"
              style={{ height: `${(point.total / max) * 100}%` }}
              title={`总跟进 ${point.total}`}
            />
            <div
              className="w-2 rounded-t bg-blue-500"
              style={{ height: `${(point.effective / max) * 100}%` }}
              title={`有效 ${point.effective}`}
            />
            <div
              className="w-2 rounded-t bg-emerald-500"
              style={{ height: `${(point.newCustomers / max) * 100}%` }}
              title={`新增 ${point.newCustomers}`}
            />
          </div>
          <span className="text-[10px] text-muted-foreground">{point.label}</span>
        </div>
      ))}
    </div>
  );
}

function DonutChart({ items }: { items: Array<{ label: string; value: number; color: string }> }) {
  if (!items.length) {
    return <p className="py-8 text-center text-sm text-muted-foreground">暂无分布数据</p>;
  }
  const total = items.reduce((s, i) => s + i.value, 0) || 1;
  let offset = 0;
  const r = 56;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex items-center gap-6">
      <svg viewBox="0 0 140 140" className="h-36 w-36 -rotate-90">
        <circle cx="70" cy="70" r={r} fill="none" stroke="#e5e7eb" strokeWidth="18" />
        {items.map((item) => {
          const len = (item.value / total) * c;
          const seg = (
            <circle
              key={item.label}
              cx="70"
              cy="70"
              r={r}
              fill="none"
              stroke={item.color}
              strokeWidth="18"
              strokeDasharray={`${len} ${c - len}`}
              strokeDashoffset={-offset}
            />
          );
          offset += len;
          return seg;
        })}
      </svg>
      <ul className="space-y-2 text-sm">
        {items.map((item) => (
          <li key={item.label} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: item.color }} />
            <span className="text-muted-foreground">{item.label}</span>
            <span className="font-medium">{item.value}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ResultFunnel({ stages }: { stages: Array<{ label: string; count: number; pct: number }> }) {
  if (!stages.length) {
    return <p className="py-8 text-center text-sm text-muted-foreground">暂无结果分布</p>;
  }
  const max = stages[0]?.count ?? 1;
  return (
    <div className="space-y-2">
      {stages.map((stage) => (
        <div key={stage.label} className="flex items-center gap-3">
          <span className="w-20 shrink-0 text-xs text-muted-foreground">{stage.label}</span>
          <div className="h-6 flex-1 overflow-hidden rounded bg-muted/50">
            <div
              className="flex h-full items-center rounded bg-primary/80 px-2 text-[10px] font-medium text-white"
              style={{ width: `${(stage.count / max) * 100}%`, minWidth: 48 }}
            >
              {stage.count}
            </div>
          </div>
          <span className="w-10 shrink-0 text-right text-xs text-muted-foreground">{stage.pct}%</span>
        </div>
      ))}
    </div>
  );
}

export function FollowUpAnalyticsWorkspace() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPreview, setIsPreview] = useState(false);
  const [overview, setOverview] = useState<SalesOverviewMetrics | null>(null);
  const [funnel, setFunnel] = useState<ConversionFunnelStep[]>([]);
  const [inquiries, setInquiries] = useState<InquiryListItem[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);

  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");

  const [range, setRange] = useState<DateRangeValue>(() => defaultDateRange("30d"));
  const dateBounds = useMemo(() => resolveDateRangeBounds(range), [range]);
  const dateRange = useMemo(
    () => ({
      from: new Date(`${dateBounds.from}T00:00:00`),
      to: new Date(`${dateBounds.to}T23:59:59`),
    }),
    [dateBounds.from, dateBounds.to],
  );

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const mode = await fetchConsoleMode().catch(() => null);
      const preview = mode ? isPreviewMode(mode) : true;
      setIsPreview(preview);
      if (preview) {
        setOverview(null);
        setFunnel([]);
        setInquiries([]);
        setCalendarEvents([]);
        return;
      }

      const fromIso = dateRange.from.toISOString();
      const toIso = dateRange.to.toISOString();
      const [nextOverview, nextFunnel, nextInquiries, nextEvents] = await Promise.all([
        fetchSalesOverview({ from: fromIso, to: toIso }),
        fetchConversionFunnel({ from: fromIso, to: toIso }),
        listInquiries({ status: "all", limit: 500 }),
        listCalendarEventsFromApi(fromIso, toIso),
      ]);
      setOverview(nextOverview);
      setFunnel(nextFunnel);
      setInquiries(nextInquiries);
      setCalendarEvents(nextEvents.filter((event) => ["follow_up", "call", "meeting", "demo"].includes(event.kind)));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "加载失败");
      setIsPreview(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateRange.from, dateRange.to]);

  useEffect(() => {
    void load();
  }, [load]);

  useOnWorkspaceChanged(() => {
    void load(true);
  });

  const kpis = useMemo(
    () =>
      isPreview
        ? FOLLOW_UP_KPIS
        : buildFollowUpKpis({ inquiries, overview, calendarEvents }),
    [isPreview, inquiries, overview, calendarEvents],
  );
  const trend = useMemo(
    () => (isPreview ? FOLLOW_UP_TREND : buildFollowUpTrend({ inquiries, calendarEvents })),
    [isPreview, inquiries, calendarEvents],
  );
  const methods = useMemo(
    () => (isPreview ? FOLLOW_UP_METHODS : buildFollowUpMethods(calendarEvents)),
    [isPreview, calendarEvents],
  );
  const results = useMemo(
    () => (isPreview ? FOLLOW_UP_RESULTS : buildFollowUpResults(inquiries)),
    [isPreview, inquiries],
  );
  const topSales = useMemo(
    () => (isPreview ? FOLLOW_UP_TOP_SALES : buildFollowUpTopSales({ inquiries, calendarEvents })),
    [isPreview, inquiries, calendarEvents],
  );
  const stageConversion = useMemo(
    () => (isPreview ? FOLLOW_UP_STAGE_CONVERSION : buildFollowUpStageConversion(funnel)),
    [isPreview, funnel],
  );
  const timeliness = useMemo(
    () => (isPreview ? FOLLOW_UP_TIMELINESS : buildFollowUpTimeliness(inquiries)),
    [isPreview, inquiries],
  );
  const records = useMemo(
    () => (isPreview ? FOLLOW_UP_RECORDS : buildFollowUpRecords({ calendarEvents, inquiries })),
    [isPreview, calendarEvents, inquiries],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return records;
    return records.filter(
      (r) =>
        r.customer.toLowerCase().includes(q) ||
        r.contact.toLowerCase().includes(q) ||
        r.owner.toLowerCase().includes(q),
    );
  }, [records, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const dateLabel = `${dateBounds.from} ~ ${dateBounds.to}`;

  if (loading && !isPreview) {
    return (
      <ConsolePage>
        <Skeleton className="mx-4 h-12 rounded-xl sm:mx-6 lg:mx-page" />
        <div className="grid gap-3 py-4 md:grid-cols-3 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-28 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="mx-4 h-96 rounded-2xl sm:mx-6 lg:mx-page" />
      </ConsolePage>
    );
  }

  return (
    <ConsolePage>
      <DataCenterToolbar
        range={range}
        onRangeChange={(next) => {
          setRange(next);
          setRefreshing(true);
        }}
        refreshing={refreshing}
        onRefresh={() => {
          setRefreshing(true);
          void load(true);
        }}
      />

      <ConsolePageAlerts>
        <ConsoleDataModeBanner feature="销售跟进分析" />
        {error ? <ConsoleRequestError message={error} onRetry={() => void load()} /> : null}
      </ConsolePageAlerts>

      <PageHeader
        title="销售跟进分析"
        description="分析销售跟进效率、方式分布与阶段转化，优化客户成交节奏。"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" type="button" asChild>
              <Link href="/dashboard/reports/export">
                <Download className="mr-1.5 h-3.5 w-3.5" />
                导出数据
              </Link>
            </Button>
          </div>
        }
      />

      <div className="space-y-4 pb-6">
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
          <StatCard emphasis="metric" label="跟进客户总数" value={String(kpis.totalCustomers.value)} icon={<Users size={22} />} iconTone="brand" trend={<TrendText value={kpis.totalCustomers.trend} />} />
          <StatCard emphasis="metric" label="跟进总次数" value={String(kpis.totalFollowUps.value)} icon={<Phone size={22} />} iconTone="success" trend={<TrendText value={kpis.totalFollowUps.trend} />} />
          <StatCard emphasis="metric" label="有效跟进次数" value={String(kpis.effectiveFollowUps.value)} icon={<Target size={22} />} iconTone="warning" trend={<TrendText value={kpis.effectiveFollowUps.trend} />} />
          <StatCard emphasis="metric" label="平均跟进周期" value={`${kpis.avgCycleDays.value} 天`} icon={<CalendarClock size={22} />} iconTone="purple" trend={<TrendText value={kpis.avgCycleDays.trend} />} />
          <StatCard emphasis="metric" label="跟进转化率" value={`${kpis.conversionRate.value}%`} icon={<TrendingUp size={22} />} iconTone="info" trend={<TrendText value={kpis.conversionRate.trend} />} />
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <section className="rounded-2xl border border-border bg-card p-4 shadow-sm xl:col-span-1">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold">跟进趋势分析</h3>
              <Badge variant="secondary">近30天</Badge>
            </div>
            <MiniLineChart points={trend} />
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-200" />总跟进</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500" />有效</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" />新增客户</span>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <h3 className="mb-4 font-semibold">跟进方式分布</h3>
            <DonutChart items={methods} />
          </section>

          <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold">跟进结果分布</h3>
              <Link href="/dashboard/inquiries" className="text-xs text-primary">查看详情 &gt;</Link>
            </div>
            <ResultFunnel stages={results} />
          </section>
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <h3 className="mb-3 font-semibold">销售跟进 TOP10</h3>
            {topSales.length === 0 ? (
              <p className="py-6 text-sm text-muted-foreground">暂无销售排行数据</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="pb-2 font-medium">排名</th>
                    <th className="pb-2 font-medium">姓名</th>
                    <th className="pb-2 font-medium">客户数</th>
                    <th className="pb-2 font-medium">跟进数</th>
                    <th className="pb-2 font-medium">转化率</th>
                  </tr>
                </thead>
                <tbody>
                  {topSales.map((row) => (
                    <tr key={row.rank} className="border-b border-border/50">
                      <td className="py-2">{row.rank}</td>
                      <td className="py-2 font-medium">{row.name}</td>
                      <td className="py-2">{row.customers}</td>
                      <td className="py-2">{row.followUps}</td>
                      <td className="py-2 text-emerald-600">{row.rate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <h3 className="mb-4 font-semibold">跟进阶段转化分析</h3>
            <div className="space-y-3">
              {stageConversion.map((stage) => (
                <div key={stage.label}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>{stage.label}</span>
                    <span className="font-medium text-primary">{stage.rate}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${stage.rate}%` }} />
                  </div>
                  {stage.drop ? (
                    <p className="mt-0.5 text-[10px] text-muted-foreground">流失 {stage.drop}%</p>
                  ) : null}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <h3 className="mb-4 font-semibold">跟进时效分析</h3>
            <DonutChart items={timeliness} />
          </section>
        </div>

        <section className="rounded-2xl border border-border bg-card shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
            <h3 className="font-semibold">跟进记录明细</h3>
            <div className="flex flex-wrap items-center gap-2">
              <input
                className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="搜索客户、联系人..."
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
              />
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => {
                  setQuery("");
                  setPage(1);
                }}
              >
                重置
              </Button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-muted/30 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">跟进时间</th>
                  <th className="px-4 py-3 font-medium">客户名称</th>
                  <th className="px-4 py-3 font-medium">联系人</th>
                  <th className="px-4 py-3 font-medium">跟进方式</th>
                  <th className="px-4 py-3 font-medium">跟进结果</th>
                  <th className="px-4 py-3 font-medium">跟进内容摘要</th>
                  <th className="px-4 py-3 font-medium">下次跟进</th>
                  <th className="px-4 py-3 font-medium">跟进人</th>
                  <th className="px-4 py-3 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {paged.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                      暂无跟进记录
                    </td>
                  </tr>
                ) : (
                  paged.map((row) => (
                    <tr key={row.id} className="border-t border-border/60 hover:bg-muted/20">
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{row.time}</td>
                      <td className="px-4 py-3 font-medium">{row.customer}</td>
                      <td className="px-4 py-3">{row.contact}</td>
                      <td className="px-4 py-3">{row.method}</td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary">{row.result}</Badge>
                      </td>
                      <td className="max-w-[200px] truncate px-4 py-3 text-muted-foreground">{row.summary}</td>
                      <td className="whitespace-nowrap px-4 py-3">{row.nextTime}</td>
                      <td className="px-4 py-3">{row.owner}</td>
                      <td className="px-4 py-3">
                        <Link href="/dashboard/tasks" className="text-xs text-primary">查看</Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm text-muted-foreground">
            <span>共 {filtered.length} 条</span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} type="button">上一页</Button>
              <span>{page} / {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} type="button">下一页</Button>
            </div>
          </div>
        </section>

        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <Info className="h-3.5 w-3.5" />
          {isPreview
            ? "预览模式下展示设计稿示例数据；接通分析 API 后将自动切换为真实跟进统计。"
            : "数据来自销售概览、转化漏斗、询盘与日历跟进事件聚合。"}
        </p>
      </div>
    </ConsolePage>
  );
}
