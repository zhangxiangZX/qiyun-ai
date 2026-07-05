"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { PageHeader, Skeleton } from "@qiyun/ui";

import {
  ConsoleDataModeBanner,
  ConsoleModeBadge,
} from "@/components/console/console-data-mode-banner";
import { ConsoleEmptyState } from "@/components/console/console-empty-catalog";
import {
  ConsolePage,
  ConsolePageAlerts,
  ConsolePageSection,
} from "@/components/console/console-page-shell";
import { ConsoleRequestError, resolveRequestErrorPresentation } from "@/components/console/console-request-error";
import { AnalyticsDataFootnote } from "@/components/dashboard/analytics-data-footnote";
import { DashboardEmptyAction } from "@/components/dashboard/empty-action";
import { DashboardTrendChart } from "@/components/dashboard/dashboard-trend-chart";
import { DashboardOverviewFilters } from "@/components/dashboard/overview/dashboard-overview-filters";
import { ReportsCitationPanel } from "@/components/reports/reports-citation-panel";
import { ReportsBotBreakdown } from "@/components/reports/reports-bot-breakdown";
import { ReportsPeriodSummary } from "@/components/reports/reports-period-summary";
import { ReportsQuestionTables } from "@/components/reports/reports-question-tables";
import {
  buildAnalyticsFilterOptions,
  buildAnalyticsQuery,
  defaultAnalyticsDateRange,
} from "@/lib/analytics/filters";
import { fetchConsoleMode, isPreviewMode } from "@/lib/api/mode";
import { listBots } from "@/lib/bots/data";
import type { BotListItem } from "@/lib/bots/types";
import { hasReportActivity } from "@/lib/analytics/activity";
import { loadReportSnapshot } from "@/lib/reports/data";
import { reportEmpty } from "@/lib/reports/mock-data";
import type { ReportSnapshot } from "@/lib/reports/types";
import { t } from "@/lib/i18n";
import { defaultLocale } from "@/lib/messages";
import { useOnWorkspaceChanged } from "@/lib/workspace-events";

type LoadState = "loading" | "ready" | "error";

export function ReportsWorkspace() {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [snapshot, setSnapshot] = useState<ReportSnapshot>(reportEmpty);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [dateRange, setDateRange] = useState(defaultAnalyticsDateRange);
  const [robotFilter, setRobotFilter] = useState("全部机器人");
  const [bots, setBots] = useState<BotListItem[]>([]);
  const [previewMode, setPreviewMode] = useState(true);

  const { dateRangeOptions, robotOptions } = useMemo(
    () => buildAnalyticsFilterOptions(bots),
    [bots],
  );

  const reportQuery = useMemo(
    () => buildAnalyticsQuery({ dateRange, robotFilter, bots }),
    [bots, dateRange, robotFilter],
  );

  useEffect(() => {
    void fetchConsoleMode()
      .then((mode) => setPreviewMode(isPreviewMode(mode)))
      .catch(() => setPreviewMode(true));
  }, []);

  useEffect(() => {
    void listBots()
      .then(setBots)
      .catch(() => setBots([]));
  }, []);

  const loadReports = useCallback(async () => {
    setLoadState("loading");
    setLoadError(null);

    try {
      const data = await loadReportSnapshot(previewMode ? {} : reportQuery);
      setSnapshot(data);
      setLoadState("ready");
    } catch (error) {
      setLoadError(error);
      setLoadState("error");
    }
  }, [previewMode, reportQuery]);

  useOnWorkspaceChanged(() => {
    void loadReports();
  });

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  const pageHeader = (
    <PageHeader
      eyebrow={t(defaultLocale, "reports.eyebrow")}
      title={t(defaultLocale, "reports.title")}
      description={t(defaultLocale, "reports.description")}
      actions={<ConsoleModeBadge />}
    />
  );

  const filterBar = (
    <DashboardOverviewFilters
      dateRange={dateRange}
      dateRangeOptions={dateRangeOptions}
      robotFilter={robotFilter}
      robotOptions={robotOptions}
      dateRangeDisabled={previewMode}
      onDateRangeChange={setDateRange}
      onRobotFilterChange={setRobotFilter}
    />
  );

  if (loadState === "loading") {
    return (
      <ConsolePage>
        {pageHeader}
        <ConsolePageAlerts>
          <ConsoleDataModeBanner feature="报表" />
          <AnalyticsDataFootnote feature="reports" />
        </ConsolePageAlerts>
        {filterBar}
        <ConsolePageSection className="pt-0">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-[132px] rounded-card" />
            ))}
          </div>
          <Skeleton className="h-[320px] rounded-card" />
          <Skeleton className="h-[280px] rounded-card" />
          <div className="grid gap-4 lg:grid-cols-2">
            <Skeleton className="h-[360px] rounded-card" />
            <Skeleton className="h-[360px] rounded-card" />
          </div>
        </ConsolePageSection>
      </ConsolePage>
    );
  }

  if (loadState === "error") {
    const { kind, message } = resolveRequestErrorPresentation(
      loadError,
      t(defaultLocale, "reports.error.load"),
    );

    return (
      <ConsolePage>
        {pageHeader}
        <ConsolePageAlerts>
          <ConsoleDataModeBanner feature="报表" />
          <AnalyticsDataFootnote feature="reports" />
          <ConsoleRequestError
            kind={kind}
            message={message}
            onRetry={() => void loadReports()}
            retryLabel={t(defaultLocale, "reports.error.retry")}
          />
        </ConsolePageAlerts>
        {filterBar}
      </ConsolePage>
    );
  }

  if (!snapshot.hasBots) {
    return (
      <ConsolePage>
        {pageHeader}
        <ConsolePageAlerts>
          <ConsoleDataModeBanner feature="报表" />
          <AnalyticsDataFootnote feature="reports" />
          <ConsoleEmptyState
            preset="noBots"
            title={t(defaultLocale, "reports.empty.title")}
            description={t(defaultLocale, "reports.empty.description")}
            action={<DashboardEmptyAction />}
          />
        </ConsolePageAlerts>
        {filterBar}
      </ConsolePage>
    );
  }

  return (
    <ConsolePage>
      {pageHeader}

      <ConsolePageAlerts>
        <ConsoleDataModeBanner feature="报表" />
        <AnalyticsDataFootnote feature="reports" />
      </ConsolePageAlerts>

      {filterBar}

      {!hasReportActivity(snapshot) ? (
        <ConsolePageSection className="pt-0">
          <ConsoleEmptyState
            preset="noReports"
            title="统计周期内暂无数据"
            description="有会话与知识引用后，周期汇总、趋势与机器人表现会显示在这里。可调整上方日期或机器人筛选后重试。"
            action={<DashboardEmptyAction />}
          />
        </ConsolePageSection>
      ) : (
        <ConsolePageSection className="space-y-6 pt-0">
          <ReportsPeriodSummary period={snapshot.period} />
          <DashboardTrendChart trend7={snapshot.trend7} trend30={snapshot.trend30} />
          <ReportsCitationPanel citations={snapshot.topCitations} />
          <ReportsBotBreakdown bots={snapshot.botMetrics} />
          <ReportsQuestionTables
            frequentQuestions={snapshot.frequentQuestions}
            unresolvedQuestions={snapshot.unresolvedQuestions}
          />
        </ConsolePageSection>
      )}
    </ConsolePage>
  );
}
