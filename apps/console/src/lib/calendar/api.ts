import { apiRequest } from "@/lib/api/client";
import { listCalendarEventsMock } from "./mock-data";
import type { CalendarEvent } from "./types";

export async function listCalendarEventsFromApi(
  from: string,
  to: string,
): Promise<CalendarEvent[]> {
  try {
    const data = await apiRequest<{ events: CalendarEvent[] }>(
      `/calendar/events?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    );
    return data?.events ?? [];
  } catch (error) {
    // V2 后端未就绪：apps/api GET /calendar/events 尚由 Codex 实现（Task #8）。
    // 上游模式下退化到演示数据，保证日历在 V2 预览阶段可演示；接入真实接口后自动生效。
    console.warn(
      "[calendar] upstream GET /calendar/events unavailable, falling back to preview data. " +
        "Check API_BASE_URL and the upstream calendar service.",
      error,
    );
    return listCalendarEventsMock(from, to);
  }
}
