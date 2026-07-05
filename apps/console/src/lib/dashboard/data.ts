import { fetchConsoleMode, isPreviewMode } from "@/lib/api/mode";
import { apiRequest } from "@/lib/api/client";
import {
  buildAnalyticsRequestPath,
  type AnalyticsQueryParams,
} from "@/lib/analytics/query-params";
import { fetchDashboardSnapshot as fetchDashboardSnapshotMock } from "@/lib/dashboard/mock-data";
import type { DashboardSnapshot } from "@/lib/dashboard/types";

export const DASHBOARD_API_AVAILABLE = true;

export type DashboardQueryParams = AnalyticsQueryParams;

export async function loadDashboardSnapshot(
  query: AnalyticsQueryParams = {},
): Promise<DashboardSnapshot> {
  const mode = await fetchConsoleMode();
  if (!isPreviewMode(mode) && DASHBOARD_API_AVAILABLE) {
    return apiRequest<DashboardSnapshot>(buildAnalyticsRequestPath("/dashboard", query));
  }

  return fetchDashboardSnapshotMock();
}
