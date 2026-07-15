import type { CalendarEventKind } from "./types";

export interface KindMeta {
  label: string;
  color: string;
}

export const KIND_META: Record<CalendarEventKind, KindMeta> = {
  follow_up: { label: "跟进回访", color: "#3b5eff" },
  demo: { label: "产品演示", color: "#22c55e" },
  meeting: { label: "商务会议", color: "#8b5cf6" },
  call: { label: "电话沟通", color: "#f97316" },
  reminder: { label: "提醒待办", color: "#06b6d4" },
};

export const CALENDAR_KINDS: CalendarEventKind[] = [
  "follow_up",
  "demo",
  "meeting",
  "call",
  "reminder",
];

export const WEEKDAY_HEADERS = ["日", "一", "二", "三", "四", "五", "六"];

/** Build a 6x7 month matrix (always 42 cells) including leading/trailing days. */
export function buildMonthMatrix(year: number, month: number): Date[][] {
  const first = new Date(year, month, 1);
  const startWeekday = first.getDay(); // 0 = Sunday
  const gridStart = new Date(year, month, 1 - startWeekday);
  const weeks: Date[][] = [];
  const cursor = new Date(gridStart);
  for (let w = 0; w < 6; w += 1) {
    const week: Date[] = [];
    for (let d = 0; d < 7; d += 1) {
      week.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }
  return weeks;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

export function formatMonthLabel(year: number, month: number): string {
  return `${year}年${month + 1}月`;
}

export function formatDayLabel(d: Date): string {
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

export function formatWeekdayShort(d: Date): string {
  return `周${WEEKDAY_HEADERS[d.getDay()]}`;
}
