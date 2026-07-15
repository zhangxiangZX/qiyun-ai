import { fetchConsoleMode, isPreviewMode } from "@/lib/api/mode";
import { listCalendarEventsMock } from "./mock-data";
import { listCalendarEventsFromApi } from "./api";
import type { CalendarEvent } from "./types";

export async function listCalendarEvents(
  from: string,
  to: string,
): Promise<CalendarEvent[]> {
  const mode = await fetchConsoleMode();
  if (isPreviewMode(mode)) {
    return listCalendarEventsMock(from, to);
  }
  return listCalendarEventsFromApi(from, to);
}
