import { fetchConsoleMode, isPreviewMode } from "@/lib/api/mode";
import { fetchDashboardSnapshot as fetchDashboardSnapshotMock } from "@/lib/dashboard/mock-data";
import type { DashboardSnapshot } from "@/lib/dashboard/types";

export const DASHBOARD_API_AVAILABLE = false;

export async function loadDashboardSnapshot(): Promise<DashboardSnapshot> {
  const mode = await fetchConsoleMode();
  if (!isPreviewMode(mode) && DASHBOARD_API_AVAILABLE) {
    throw new Error("Dashboard analytics API is not wired yet.");
  }
  return fetchDashboardSnapshotMock();
}
