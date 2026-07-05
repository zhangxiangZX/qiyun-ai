import { fetchConsoleMode, isPreviewMode } from "@/lib/api/mode";
import { apiRequest } from "@/lib/api/client";
import {
  buildAnalyticsRequestPath,
  type AnalyticsQueryParams,
} from "@/lib/analytics/query-params";
import { fetchReportSnapshot } from "@/lib/reports/mock-data";
import type { ReportSnapshot } from "@/lib/reports/types";

export const ANALYTICS_API_AVAILABLE = true;

export type ReportQueryParams = AnalyticsQueryParams;

export async function loadReportSnapshot(
  query: AnalyticsQueryParams = {},
): Promise<ReportSnapshot> {
  const mode = await fetchConsoleMode();
  if (!isPreviewMode(mode) && ANALYTICS_API_AVAILABLE) {
    return apiRequest<ReportSnapshot>(buildAnalyticsRequestPath("/reports", query));
  }
  return fetchReportSnapshot();
}
