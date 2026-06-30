"use client";

import { useCallback, useEffect, useState } from "react";
import { BarChart3, Bot } from "lucide-react";

import { Alert, Button, EmptyState, PageHeader, Skeleton } from "@qiyun/ui";

import { DashboardInsightPanels } from "@/components/dashboard/dashboard-insight-panels";
import { DashboardKpiGrid } from "@/components/dashboard/dashboard-kpi-grid";
import { DashboardRecentLeads } from "@/components/dashboard/dashboard-recent-leads";
import { DashboardTrendChart } from "@/components/dashboard/dashboard-trend-chart";
import { DashboardEmptyAction } from "@/components/dashboard/empty-action";
import {
  ConsoleDataModeBanner,
  ConsoleModeBadge,
} from "@/components/console/console-data-mode-banner";
import { DASHBOARD_API_AVAILABLE, loadDashboardSnapshot } from "@/lib/dashboard/data";
import { dashboardEmpty } from "@/lib/dashboard/mock-data";
import { fetchConsoleMode, isPreviewMode } from "@/lib/api/mode";
import type { DashboardSnapshot } from "@/lib/dashboard/types";
import { t } from "@/lib/i18n";
import { defaultLocale } from "@/lib/messages";

type LoadState = "loading" | "ready" | "error";

export function DashboardWorkspace() {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [snapshot, setSnapshot] = useState<DashboardSnapshot>(dashboardEmpty);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(true);

  useEffect(() => {
    void fetchConsoleMode()
      .then((info) => setPreviewMode(isPreviewMode(info)))
      .catch(() => setPreviewMode(true));
  }, []);

  const loadDashboard = useCallback(async () => {
    setLoadState("loading");
    setErrorMessage(null);

    try {
      const data = await loadDashboardSnapshot();
      setSnapshot(data);
      setLoadState("ready");
    } catch {
      setErrorMessage(t(defaultLocale, "dashboard.error.load"));
      setLoadState("error");
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const demoDataAlert = !DASHBOARD_API_AVAILABLE ? (
    <Alert variant="warning" title="概览数据为演示">
      {previewMode
        ? "未配置 API_BASE_URL，以下 KPI、趋势与最近线索为前端演示数据。"
        : "已连接 apps/api，但概览分析接口（E-06）尚未接入，以下仍为演示数据。"}
    </Alert>
  ) : null;

  const modeHeaderActions = <ConsoleModeBadge />;

  if (loadState === "loading") {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow={t(defaultLocale, "dashboard.eyebrow")}
          title={t(defaultLocale, "dashboard.title")}
          description={t(defaultLocale, "dashboard.description")}
          actions={modeHeaderActions}
        />
        <section className="px-4 sm:px-6 lg:px-page">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-[132px] rounded-card" />
            ))}
          </div>
        </section>
        <section className="space-y-4 px-4 sm:px-6 lg:px-page">
          <Skeleton className="h-[320px] rounded-card" />
          <div className="grid gap-4 lg:grid-cols-2">
            <Skeleton className="h-[360px] rounded-card" />
            <Skeleton className="h-[360px] rounded-card" />
          </div>
          <Skeleton className="h-[280px] rounded-card" />
        </section>
      </div>
    );
  }

  if (loadState === "error") {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow={t(defaultLocale, "dashboard.eyebrow")}
          title={t(defaultLocale, "dashboard.title")}
          description={t(defaultLocale, "dashboard.description")}
          actions={modeHeaderActions}
        />
        <div className="space-y-4 px-4 sm:px-6 lg:px-page">
          <ConsoleDataModeBanner feature="概览" />
          <Alert
            variant="error"
            title={errorMessage ?? t(defaultLocale, "dashboard.error.load")}
          />
          <Button variant="outline" size="sm" onClick={() => void loadDashboard()}>
            {t(defaultLocale, "dashboard.error.retry")}
          </Button>
        </div>
      </div>
    );
  }

  if (!snapshot.hasBots) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow={t(defaultLocale, "dashboard.eyebrow")}
          title={t(defaultLocale, "dashboard.title")}
          description={t(defaultLocale, "dashboard.empty.pageDescription")}
          actions={modeHeaderActions}
        />
        <div className="space-y-4 px-4 sm:px-6 lg:px-page">
          <ConsoleDataModeBanner feature="概览" />
          {demoDataAlert}
          <EmptyState
            icon={<Bot className="h-8 w-8" aria-hidden />}
            title={t(defaultLocale, "dashboard.empty.title")}
            description={t(defaultLocale, "dashboard.empty.description")}
            action={<DashboardEmptyAction />}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t(defaultLocale, "dashboard.eyebrow")}
        title={t(defaultLocale, "dashboard.title")}
        description={t(defaultLocale, "dashboard.description")}
        actions={modeHeaderActions}
      />

      <div className="space-y-4 px-4 sm:px-6 lg:px-page">
        <ConsoleDataModeBanner feature="概览" />
        {demoDataAlert}
      </div>

      <section className="px-4 sm:px-6 lg:px-page">
        <DashboardKpiGrid items={snapshot.kpis} />
      </section>

      <section className="space-y-4 px-4 sm:px-6 lg:px-page">
        <DashboardTrendChart trend7={snapshot.trend7} trend30={snapshot.trend30} />

        <DashboardInsightPanels
          frequentQuestions={snapshot.frequentQuestions}
          unresolvedQuestions={snapshot.unresolvedQuestions}
        />

        {snapshot.recentLeads.length ? (
          <DashboardRecentLeads leads={snapshot.recentLeads} />
        ) : (
          <EmptyState
            icon={<BarChart3 className="h-8 w-8" aria-hidden />}
            title={t(defaultLocale, "dashboard.leads.empty.title")}
            description={t(defaultLocale, "dashboard.leads.empty.description")}
            action={<DashboardEmptyAction />}
          />
        )}
      </section>
    </div>
  );
}
