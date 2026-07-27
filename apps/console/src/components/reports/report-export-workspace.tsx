"use client";

import { Badge, Button, PageHeader, Skeleton, StatCard } from "@qiyun/ui";

import { EnterpriseExportIcon } from "@/components/brand/enterprise-export-icon";
import { DataCenterToolbar } from "@/components/data-center/data-center-toolbar";
import {
  defaultDateRange,
  resolveDateRangeBounds,
  type DateRangeValue,
} from "@/components/ui/date-range-picker";
import { ConsoleDataModeBanner } from "@/components/console/console-data-mode-banner";
import { ConsoleFeedback } from "@/components/console/console-feedback";
import { ConsolePage, ConsolePageAlerts } from "@/components/console/console-page-shell";
import { ConsoleRequestError } from "@/components/console/console-request-error";
import { ReportExportModal } from "@/components/reports/report-export-modal";
import {
  BarChart3,
  CircleCheck,
  FileSpreadsheet,
  History,
  Loader2,
  TrendingUp,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  buildAnalyticsQuery,
  defaultAnalyticsDateRange,
} from "@/lib/analytics/filters";
import { fetchConsoleMode, isPreviewMode } from "@/lib/api/mode";
import {
  buildReportCsv,
  buildSalesExportFunnel,
  buildSalesExportKpis,
  buildSalesExportTopRows,
  buildSalesExportTrend,
  reportFileName,
} from "@/lib/reports/export-helpers";
import {
  buildMockReportExports,
  buildPreviewExportTask,
  downloadReportExport,
  formatBytes,
  listReportExports,
  REPORT_TYPE_LABELS,
  triggerDownload,
  type ReportExportApiType,
  type ReportExportStatus,
  type ReportExportTask,
} from "@/lib/reports/export-api";
import {
  fetchChannelAttribution,
  fetchConversionFunnel,
  fetchSalesOverview,
  listInquiries,
} from "@/lib/sales/api";
import { filterInquiriesByDateRange } from "@/lib/sales/inquiry-export";
import type {
  ChannelAttributionItem,
  ConversionFunnelStep,
  InquiryListItem,
  SalesOverviewMetrics,
} from "@/lib/sales/types";
import { useOnWorkspaceChanged } from "@/lib/workspace-events";

const KPI_ICONS = [TrendingUp, CircleCheck, Users, FileSpreadsheet] as const;
const KPI_TONES = ["brand", "success", "warning", "info"] as const;

type LoadState = "loading" | "ready" | "error";

export function ReportExportWorkspace() {
  const [exportOpen, setExportOpen] = useState(false);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [loadError, setLoadError] = useState<unknown>(null);
  const [previewMode, setPreviewMode] = useState(true);
  const [overview, setOverview] = useState<SalesOverviewMetrics | null>(null);
  const [funnel, setFunnel] = useState<ConversionFunnelStep[]>([]);
  const [inquiries, setInquiries] = useState<InquiryListItem[]>([]);
  const [channels, setChannels] = useState<ChannelAttributionItem[]>([]);
  const [exports, setExports] = useState<ReportExportTask[]>([]);
  const [exportsLoading, setExportsLoading] = useState(false);
  const [exportNotice, setExportNotice] = useState(false);
  const [downloadId, setDownloadId] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const [range, setRange] = useState<DateRangeValue>(() => defaultDateRange("30d"));
  const dateBounds = useMemo(() => resolveDateRangeBounds(range), [range]);

  const reportQuery = useMemo(
    () => ({
      ...buildAnalyticsQuery({ dateRange: defaultAnalyticsDateRange(), robotFilter: "全部机器人", bots: [] }),
      from: dateBounds.from,
      to: dateBounds.to,
    }),
    [dateBounds.from, dateBounds.to],
  );

  useEffect(() => {
    void fetchConsoleMode()
      .then((mode) => setPreviewMode(isPreviewMode(mode)))
      .catch(() => setPreviewMode(true));
  }, []);

  const loadExports = useCallback(async () => {
    setExportsLoading(true);
    try {
      if (previewMode) {
        setExports(buildMockReportExports());
      } else {
        setExports(await listReportExports());
      }
    } catch {
      setExports([]);
    } finally {
      setExportsLoading(false);
    }
  }, [previewMode]);

  useEffect(() => {
    void loadExports();
  }, [loadExports]);

  const dateLabel = `${dateBounds.from} ~ ${dateBounds.to}`;

  const scopedInquiries = useMemo(
    () => filterInquiriesByDateRange(inquiries, dateBounds.from, dateBounds.to),
    [inquiries, dateBounds.from, dateBounds.to],
  );

  const downloadCsvForType = useCallback(
    (type: ReportExportApiType) => {
      const csv = buildReportCsv({
        type,
        overview,
        funnel,
        inquiries: scopedInquiries,
        channels,
        rangeLabel: dateLabel,
      });
      const fileName = reportFileName(type);
      triggerDownload(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }), fileName);
      return fileName;
    },
    [overview, funnel, scopedInquiries, channels, dateLabel],
  );

  const handleExportCreated = useCallback((task: ReportExportTask) => {
    setExports((prev) => [task, ...prev]);
    setExportNotice(true);
  }, []);

  const handleClientExport = useCallback(
    async (type: ReportExportApiType) => {
      const fileName = downloadCsvForType(type);
      const task = buildPreviewExportTask(type);
      task.fileName = fileName;
      task.sizeBytes = Math.max(256, fileName.length * 32);
      handleExportCreated(task);
      return task;
    },
    [downloadCsvForType, handleExportCreated],
  );

  const handleDownload = useCallback(
    async (task: ReportExportTask) => {
      if (downloadId) return;
      setDownloadId(task.id);
      setDownloadError(null);
      try {
        // memory 驱动下服务端 download 会 404：优先用当前页真实数据重新生成 CSV
        try {
          if (!previewMode) {
            await downloadReportExport(task.id, task.fileName ?? "report.csv");
            return;
          }
        } catch {
          // fall through to client rebuild
        }
        downloadCsvForType(task.reportType);
      } catch (nextError) {
        setDownloadError(nextError instanceof Error ? nextError.message : "下载失败，请稍后重试。");
      } finally {
        setDownloadId(null);
      }
    },
    [downloadCsvForType, downloadId, previewMode],
  );

  const loadPreview = useCallback(async () => {
    setLoadState("loading");
    setLoadError(null);

    try {
      const [nextOverview, nextFunnel, nextInquiries, nextChannels] = await Promise.all([
        fetchSalesOverview(reportQuery),
        fetchConversionFunnel(reportQuery),
        listInquiries({ status: "all", limit: 200 }),
        fetchChannelAttribution({ from: dateBounds.from, to: dateBounds.to }),
      ]);
      setOverview(nextOverview);
      setFunnel(nextFunnel);
      setInquiries(nextInquiries);
      setChannels(nextChannels);
      setLoadState("ready");
    } catch (error) {
      if (previewMode) {
        setOverview(null);
        setFunnel([]);
        setInquiries([]);
        setChannels([]);
        setLoadState("ready");
        return;
      }
      setLoadError(error);
      setLoadState("error");
    }
  }, [previewMode, reportQuery, dateBounds.from, dateBounds.to]);

  useOnWorkspaceChanged(() => {
    void loadPreview();
    void loadExports();
  });

  useEffect(() => {
    void loadPreview();
  }, [loadPreview]);

  const kpis = buildSalesExportKpis(overview);
  const funnelRows = buildSalesExportFunnel(funnel);
  const topRows = buildSalesExportTopRows(scopedInquiries);
  const trendHeights = buildSalesExportTrend(funnel);

  if (loadState === "loading") {
    return (
      <ConsolePage>
        <DataCenterToolbar range={range} onRangeChange={setRange} exportHref="" />
        <ConsolePageAlerts>
          <ConsoleDataModeBanner feature="经营报表导出" />
        </ConsolePageAlerts>
        <div className="space-y-4 pb-6">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-28 rounded-2xl" />
            ))}
          </div>
        </div>
      </ConsolePage>
    );
  }

  if (loadState === "error") {
    return (
      <ConsolePage>
        <DataCenterToolbar range={range} onRangeChange={setRange} exportHref="" />
        <ConsolePageAlerts>
          <ConsoleDataModeBanner feature="经营报表导出" />
        </ConsolePageAlerts>
        <ConsoleRequestError
          message={loadError instanceof Error ? loadError.message : "报表数据加载失败，请稍后重试。"}
          onRetry={() => void loadPreview()}
        />
      </ConsolePage>
    );
  }

  return (
    <ConsolePage>
      <DataCenterToolbar range={range} onRangeChange={setRange} exportHref="" />

      <ConsolePageAlerts>
        <ConsoleDataModeBanner feature="经营报表导出" />
        {exportNotice ? (
          <ConsoleFeedback
            variant="success"
            title="导出任务已创建"
            message="报表已加入导出任务队列，可在下方「导出历史」中下载。"
            onDismiss={() => setExportNotice(false)}
          />
        ) : null}
        {downloadError ? (
          <ConsoleFeedback
            variant="error"
            title="下载失败"
            message={downloadError}
            onDismiss={() => setDownloadError(null)}
          />
        ) : null}
      </ConsolePageAlerts>

      <PageHeader
        variant="compact"
        title="经营报表导出"
        description="按业务模块导出销售业绩、询盘与渠道经营数据，当前支持 CSV 格式。"
      />

      <div className="space-y-4 pb-6">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-sm">
          <div>
            <h2 className="font-semibold">销售业绩报表</h2>
            <p className="text-sm text-muted-foreground">预览导出前的报表样式与数据范围</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{dateLabel}</span>
            <Button variant="outline" size="sm" type="button" onClick={() => void loadPreview()}>
              刷新
            </Button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {kpis.map((stat, index) => {
            const Icon = KPI_ICONS[index] ?? TrendingUp;
            const tone = KPI_TONES[index] ?? "brand";
            return (
              <StatCard
                key={stat.label}
                emphasis="metric"
                label={stat.label}
                value={stat.value}
                icon={<Icon size={22} />}
                iconTone={tone}
                trend={
                  stat.trend === "—" ? (
                    <span className="text-xs text-muted-foreground">环比 —</span>
                  ) : (
                    <span className="text-xs font-medium text-emerald-600">↑ {stat.trend}</span>
                  )
                }
              />
            );
          })}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold">销售趋势</h3>
              <Badge variant="secondary">近 30 天</Badge>
            </div>
            <div className="flex h-40 items-end gap-1">
              {trendHeights.map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t bg-primary/70"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <h3 className="mb-3 font-semibold">销售漏斗</h3>
            <div className="space-y-2">
              {funnelRows.length ? (
                funnelRows.map((stage) => (
                  <div key={stage.label} className="flex items-center gap-3">
                    <span className="w-16 truncate text-sm text-muted-foreground">{stage.label}</span>
                    <div className="h-5 flex-1 overflow-hidden rounded bg-muted">
                      <div className="h-full rounded bg-primary" style={{ width: `${stage.pct}%` }} />
                    </div>
                    <span className="w-10 text-right text-sm">{stage.pct}%</span>
                  </div>
                ))
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">暂无漏斗数据</p>
              )}
            </div>
          </section>
        </div>

        <section className="rounded-2xl border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 className="font-semibold">销售明细</h3>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </div>
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">销售人员</th>
                <th className="px-4 py-3 font-medium">客户数</th>
                <th className="px-4 py-3 font-medium">成交率</th>
                <th className="px-4 py-3 font-medium">销售额</th>
              </tr>
            </thead>
            <tbody>
              {topRows.length ? (
                topRows.map((row) => (
                  <tr key={row.name} className="border-t border-border/60">
                    <td className="px-4 py-3 font-medium">{row.name}</td>
                    <td className="px-4 py-3">{row.customers}</td>
                    <td className="px-4 py-3 text-emerald-600">{row.rate}</td>
                    <td className="px-4 py-3">{row.amount}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                    暂无销售明细
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        <section className="rounded-2xl border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold">导出任务历史</h3>
            </div>
            <Button variant="outline" size="sm" type="button" onClick={() => void loadExports()}>
              刷新
            </Button>
          </div>
          {exportsLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : exports.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">
              暂无导出任务。点击右上角「导出报表」生成第一份报表。
            </p>
          ) : (
            <ul className="divide-y divide-border/60">
              {exports.map((task) => {
                const statusMeta: Record<ReportExportStatus, { label: string; cls: string }> = {
                  pending: { label: "排队中", cls: "bg-amber-100 text-amber-700" },
                  processing: { label: "生成中", cls: "bg-blue-100 text-blue-700" },
                  completed: { label: "已完成", cls: "bg-emerald-100 text-emerald-700" },
                  failed: { label: "失败", cls: "bg-red-100 text-red-700" },
                };
                const meta = statusMeta[task.status];
                const canDownload = task.status === "completed";
                return (
                  <li key={task.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${meta.cls}`}>
                      {meta.label}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {REPORT_TYPE_LABELS[task.reportType] ?? task.reportType}
                        {task.fileName ? (
                          <span className="ml-2 font-normal text-muted-foreground">{task.fileName}</span>
                        ) : null}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(task.createdAt).toLocaleString("zh-CN", {
                          month: "2-digit",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {task.sizeBytes ? ` · ${formatBytes(task.sizeBytes)}` : ""}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      disabled={!canDownload || downloadId === task.id}
                      onClick={() => void handleDownload(task)}
                    >
                      {downloadId === task.id ? (
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <EnterpriseExportIcon className="mr-1.5 h-3.5 w-3.5" size={14} />
                      )}
                      下载
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <ReportExportModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        previewMode={previewMode}
        onExport={handleClientExport}
      />
    </ConsolePage>
  );
}
