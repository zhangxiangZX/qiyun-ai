"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  DashboardOverviewEmpty,
  DashboardOverviewError,
  DashboardOverviewSkeleton,
  DashboardOverviewView,
} from "@/components/dashboard/overview/dashboard-overview-view";
import { DashboardEmptyAction } from "@/components/dashboard/empty-action";
import { listBots } from "@/lib/bots/data";
import type { BotListItem } from "@/lib/bots/types";
import {
  buildAnalyticsFilterOptions,
  buildAnalyticsQuery,
  defaultAnalyticsDateRange,
} from "@/lib/analytics/filters";
import {
  loadDashboardSnapshot,
} from "@/lib/dashboard/data";
import { dashboardEmpty } from "@/lib/dashboard/mock-data";
import type { DashboardSnapshot } from "@/lib/dashboard/types";
import { resolveDashboardWorkspaceView } from "@/lib/dashboard/workspace-view";
import { fetchConsoleMode, isPreviewMode } from "@/lib/api/mode";
import { t } from "@/lib/i18n";
import { defaultLocale } from "@/lib/messages";
import { useOnWorkspaceChanged } from "@/lib/workspace-events";

type LoadState = "loading" | "ready" | "error";

export function DashboardWorkspace() {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [snapshot, setSnapshot] = useState<DashboardSnapshot>(dashboardEmpty);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [dateRange, setDateRange] = useState(defaultAnalyticsDateRange);
  const [robotFilter, setRobotFilter] = useState("全部机器人");
  const [bots, setBots] = useState<BotListItem[]>([]);
  const [previewMode, setPreviewMode] = useState(true);

  const { dateRangeOptions, robotOptions } = useMemo(
    () => buildAnalyticsFilterOptions(bots),
    [bots],
  );

  const dashboardQuery = useMemo(
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

  const loadDashboard = useCallback(async () => {
    setLoadState("loading");
    setLoadError(null);

    try {
      const data = await loadDashboardSnapshot(previewMode ? {} : dashboardQuery);
      setSnapshot(data);
      setLoadState("ready");
    } catch (error) {
      setLoadError(error);
      setLoadState("error");
    }
  }, [dashboardQuery, previewMode]);

  useOnWorkspaceChanged(() => {
    void loadDashboard();
  });

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const workspaceView = resolveDashboardWorkspaceView(loadState, snapshot);

  if (workspaceView === "loading") {
    return <DashboardOverviewSkeleton />;
  }

  if (workspaceView === "error") {
    return (
      <DashboardOverviewError
        error={loadError}
        fallback={t(defaultLocale, "dashboard.error.load")}
        onRetry={() => void loadDashboard()}
        retryLabel={t(defaultLocale, "dashboard.error.retry")}
      />
    );
  }

  if (workspaceView === "empty_no_bots") {
    return (
      <DashboardOverviewEmpty
        title={t(defaultLocale, "dashboard.empty.title")}
        description={t(defaultLocale, "dashboard.empty.description")}
        action={<DashboardEmptyAction />}
      />
    );
  }

  if (workspaceView === "empty_no_activity") {
    return (
      <DashboardOverviewEmpty
        title="暂无业务数据"
        description="机器人已创建，但当前工作区在统计周期内还没有会话或线索。部署 Widget 并开始接待访客后，指标会出现在这里。"
        action={<DashboardEmptyAction />}
      />
    );
  }

  return (
    <DashboardOverviewView
      snapshot={snapshot}
      dateRange={dateRange}
      dateRangeOptions={dateRangeOptions}
      robotFilter={robotFilter}
      bots={bots}
      upstreamFiltersEnabled={!previewMode}
      onDateRangeChange={setDateRange}
      onRobotFilterChange={setRobotFilter}
    />
  );
}
