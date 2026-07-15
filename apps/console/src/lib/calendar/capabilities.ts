import { fetchConsoleMode, isPreviewMode } from "@/lib/api/mode";
import { t } from "@/lib/i18n";
import { defaultLocale } from "@/lib/messages";
import type { CalendarCapabilities } from "./types";

/**
 * BFF 路由 GET /api/calendar/events 已就绪。
 * 上游代理目标 apps/api GET /calendar/events 由 Codex 实现（V2 后端，见 Task #8）。
 */
export const CALENDAR_BFF_READY = true;

export async function getCalendarCapabilities(): Promise<CalendarCapabilities> {
  const mode = await fetchConsoleMode();
  const preview = isPreviewMode(mode);

  if (preview) {
    return { dataMode: "preview", canReadEvents: true };
  }

  return {
    dataMode: "upstream",
    canReadEvents: CALENDAR_BFF_READY,
    upstreamNote: t(defaultLocale, "calendar.mode.upstreamPending"),
  };
}
