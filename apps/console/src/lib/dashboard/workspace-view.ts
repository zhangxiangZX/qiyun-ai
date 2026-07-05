import { hasDashboardActivity } from "@/lib/analytics/activity";
import type { DashboardSnapshot } from "@/lib/dashboard/types";

export type DashboardWorkspaceView =
  | "loading"
  | "error"
  | "empty_no_bots"
  | "empty_no_activity"
  | "ready";

export function resolveDashboardWorkspaceView(
  loadState: "loading" | "ready" | "error",
  snapshot: DashboardSnapshot,
): DashboardWorkspaceView {
  if (loadState === "loading") return "loading";
  if (loadState === "error") return "error";
  if (!snapshot.hasBots) return "empty_no_bots";
  if (!hasDashboardActivity(snapshot)) return "empty_no_activity";
  return "ready";
}
