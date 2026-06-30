"use client";

import { useCallback, useEffect, useState } from "react";
import { Bot } from "lucide-react";

import { Alert, Button, EmptyState, PageHeader, Skeleton } from "@qiyun/ui";

import {
  ConsoleDataModeBanner,
  ConsoleModeBadge,
} from "@/components/console/console-data-mode-banner";
import { DashboardEmptyAction } from "@/components/dashboard/empty-action";
import { DashboardTrendChart } from "@/components/dashboard/dashboard-trend-chart";
import { ReportsBotBreakdown } from "@/components/reports/reports-bot-breakdown";
import { ReportsPeriodSummary } from "@/components/reports/reports-period-summary";
import { ReportsQuestionTables } from "@/components/reports/reports-question-tables";
import { fetchConsoleMode, isPreviewMode } from "@/lib/api/mode";
import { ANALYTICS_API_AVAILABLE, loadReportSnapshot } from "@/lib/reports/data";
import { reportEmpty } from "@/lib/reports/mock-data";
import type { ReportSnapshot } from "@/lib/reports/types";
import { t } from "@/lib/i18n";
import { defaultLocale } from "@/lib/messages";

type LoadState = "loading" | "ready" | "error";

export function ReportsWorkspace() {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [snapshot, setSnapshot] = useState<ReportSnapshot>(reportEmpty);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(true);

  useEffect(() => {
    void fetchConsoleMode()
      .then((info) => setPreviewMode(isPreviewMode(info)))
      .catch(() => setPreviewMode(true));
  }, []);

  const loadReports = useCallback(async () => {
    setLoadState("loading");
    setErrorMessage(null);

    try {
      const data = await loadReportSnapshot();
      setSnapshot(data);
      setLoadState("ready");
    } catch {
      setErrorMessage(t(defaultLocale, "reports.error.load"));
      setLoadState("error");
    }
  }, []);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  const demoDataAlert = !ANALYTICS_API_AVAILABLE ? (
    <Alert variant="warning" title="报表数据为演示">
      {previewMode
        ? "未配置 API_BASE_URL，以下周期汇总、趋势与机器人表现为前端演示数据。"
        : "已连接 apps/api，但分析接口（E-06）尚未接入，以下仍为演示数据。"}
    </Alert>
  ) : null;

  if (loadState === "loading") {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow={t(defaultLocale, "reports.eyebrow")}
          title={t(defaultLocale, "reports.title")}
          description={t(defaultLocale, "reports.description")}
          actions={<ConsoleModeBadge />}
        />
        <section className="space-y-4 px-4 sm:px-6 lg:px-page">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-[132px] rounded-card" />
            ))}
          </div>
          <Skeleton className="h-[320px] rounded-card" />
          <Skeleton className="h-[280px] rounded-card" />
        </section>
      </div>
    );
  }

  if (loadState === "error") {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow={t(defaultLocale, "reports.eyebrow")}
          title={t(defaultLocale, "reports.title")}
          description={t(defaultLocale, "reports.description")}
          actions={<ConsoleModeBadge />}
        />
        <div className="space-y-4 px-4 sm:px-6 lg:px-page">
          <ConsoleDataModeBanner feature="报表" />
          <Alert variant="error" title={errorMessage ?? t(defaultLocale, "reports.error.load")} />
          <Button variant="outline" size="sm" onClick={() => void loadReports()}>
            {t(defaultLocale, "reports.error.retry")}
          </Button>
        </div>
      </div>
    );
  }

  if (!snapshot.hasBots) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow={t(defaultLocale, "reports.eyebrow")}
          title={t(defaultLocale, "reports.title")}
          description={t(defaultLocale, "reports.description")}
          actions={<ConsoleModeBadge />}
        />
        <div className="space-y-4 px-4 sm:px-6 lg:px-page">
          <ConsoleDataModeBanner feature="报表" />
          {demoDataAlert}
          <EmptyState
            icon={<Bot className="h-8 w-8" aria-hidden />}
            title={t(defaultLocale, "reports.empty.title")}
            description={t(defaultLocale, "reports.empty.description")}
            action={<DashboardEmptyAction />}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t(defaultLocale, "reports.eyebrow")}
        title={t(defaultLocale, "reports.title")}
        description={t(defaultLocale, "reports.description")}
        actions={<ConsoleModeBadge />}
      />

      <div className="space-y-4 px-4 sm:px-6 lg:px-page">
        <ConsoleDataModeBanner feature="报表" />
        {demoDataAlert}
      </div>

      <section className="space-y-6 px-4 sm:px-6 lg:px-page">
        <ReportsPeriodSummary period={snapshot.period} />
        <DashboardTrendChart trend7={snapshot.trend7} trend30={snapshot.trend30} />
        <ReportsBotBreakdown bots={snapshot.botMetrics} />
        <ReportsQuestionTables
          frequentQuestions={snapshot.frequentQuestions}
          unresolvedQuestions={snapshot.unresolvedQuestions}
        />
      </section>
    </div>
  );
}
