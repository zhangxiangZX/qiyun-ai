"use client";

import { useCallback, useEffect, useState } from "react";

import {
  DashboardOverviewEmpty,
  DashboardOverviewError,
} from "@/components/dashboard/overview/dashboard-overview-view";
import { ConsolePage } from "@/components/console/console-page-shell";
import { HomeOverviewWorkspace } from "@/components/dashboard/home-overview-workspace";
import { DashboardEmptyAction } from "@/components/dashboard/empty-action";
import { loadDashboardSnapshot } from "@/lib/dashboard/data";
import { dashboardEmpty } from "@/lib/dashboard/mock-data";
import type { DashboardSnapshot } from "@/lib/dashboard/types";
import { resolveDashboardWorkspaceView } from "@/lib/dashboard/workspace-view";
import { t } from "@/lib/i18n";
import { defaultLocale } from "@/lib/messages";
import { useOnWorkspaceChanged } from "@/lib/workspace-events";
import styles from "@/styles/home-overview.module.css";

type LoadState = "loading" | "ready" | "error";

function HomeOverviewSkeleton() {
  return (
    <div className={styles.page}>
      <div className={styles.skeleton} style={{ height: 72 }} />
      <div className={styles.kpiGrid}>
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className={styles.skeleton} style={{ height: 118 }} />
        ))}
      </div>
      <div className={styles.chartsRow}>
        <div className={styles.skeleton} style={{ height: 320 }} />
        <div className={styles.skeleton} style={{ height: 320 }} />
      </div>
      <div className={styles.tablesRow}>
        <div className={styles.skeleton} style={{ height: 360 }} />
        <div className={styles.skeleton} style={{ height: 360 }} />
        <div className={styles.skeleton} style={{ height: 360 }} />
      </div>
    </div>
  );
}

export function DashboardWorkspace() {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [snapshot, setSnapshot] = useState<DashboardSnapshot>(dashboardEmpty);
  const [loadError, setLoadError] = useState<unknown>(null);

  const loadDashboard = useCallback(async () => {
    setLoadState("loading");
    setLoadError(null);

    try {
      const data = await loadDashboardSnapshot({});
      setSnapshot(data);
      setLoadState("ready");
    } catch (error) {
      setLoadError(error);
      setLoadState("error");
    }
  }, []);

  useOnWorkspaceChanged(() => {
    void loadDashboard();
  });

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const workspaceView = resolveDashboardWorkspaceView(loadState, snapshot);

  if (workspaceView === "loading") {
    return (
      <ConsolePage>
        <HomeOverviewSkeleton />
      </ConsolePage>
    );
  }

  if (workspaceView === "error") {
    return (
      <ConsolePage>
        <DashboardOverviewError
          error={loadError}
          fallback={t(defaultLocale, "dashboard.error.load")}
          onRetry={() => void loadDashboard()}
          retryLabel={t(defaultLocale, "dashboard.error.retry")}
        />
      </ConsolePage>
    );
  }

  if (workspaceView === "empty_no_bots") {
    return (
      <ConsolePage>
        <DashboardOverviewEmpty
          title={t(defaultLocale, "dashboard.empty.title")}
          description={t(defaultLocale, "dashboard.empty.description")}
          action={<DashboardEmptyAction />}
        />
      </ConsolePage>
    );
  }

  return <HomeOverviewWorkspace />;
}
