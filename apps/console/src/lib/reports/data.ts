import { fetchConsoleMode, isPreviewMode } from "@/lib/api/mode";
import { fetchReportSnapshotMock } from "@/lib/reports/mock-data";
import type { ReportSnapshot } from "@/lib/reports/types";

export const ANALYTICS_API_AVAILABLE = false;

export async function loadReportSnapshot(): Promise<ReportSnapshot> {
  const mode = await fetchConsoleMode();
  if (!isPreviewMode(mode) && ANALYTICS_API_AVAILABLE) {
    throw new Error("Analytics API is not wired yet.");
  }
  return fetchReportSnapshotMock();
}
