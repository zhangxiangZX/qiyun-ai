import assert from "node:assert/strict";
import test from "node:test";

import { hasDashboardActivity } from "@/lib/analytics/activity";
import { dashboardEmpty, dashboardWithBots } from "@/lib/dashboard/mock-data";
import { resolveDashboardWorkspaceView } from "@/lib/dashboard/workspace-view";

test("resolveDashboardWorkspaceView maps dashboard page states", () => {
  assert.equal(resolveDashboardWorkspaceView("loading", dashboardWithBots), "loading");
  assert.equal(resolveDashboardWorkspaceView("error", dashboardWithBots), "error");
  assert.equal(resolveDashboardWorkspaceView("ready", dashboardEmpty), "empty_no_bots");
});

test("resolveDashboardWorkspaceView detects no-activity empty state", () => {
  const snapshot = {
    ...dashboardWithBots,
    kpis: dashboardWithBots.kpis.map((item) => ({ ...item, value: "0" })),
    trend7: dashboardWithBots.trend7.map((point) => ({ ...point, sessions: 0, leads: 0 })),
    trend30: dashboardWithBots.trend30.map((point) => ({ ...point, sessions: 0, leads: 0 })),
    recentLeads: [],
  };

  assert.equal(resolveDashboardWorkspaceView("ready", snapshot), "empty_no_activity");
  assert.equal(hasDashboardActivity(snapshot), false);
});

test("resolveDashboardWorkspaceView returns ready for active snapshots", () => {
  assert.equal(resolveDashboardWorkspaceView("ready", dashboardWithBots), "ready");
  assert.equal(hasDashboardActivity(dashboardWithBots), true);
});
