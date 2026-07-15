"use client";

import type { CalendarEvent } from "@/lib/calendar/types";
import {
  KIND_META,
  WEEKDAY_HEADERS,
  dayKey,
  formatTime,
  isSameDay,
} from "@/lib/calendar/calendar-utils";
import styles from "@/styles/calendar.module.css";

interface MonthGridProps {
  weeks: Date[][];
  month: number;
  today: Date;
  selectedDay: Date;
  eventsByDay: Map<string, CalendarEvent[]>;
  onSelectDay: (day: Date) => void;
}

export function MonthGrid({
  weeks,
  month,
  today,
  selectedDay,
  eventsByDay,
  onSelectDay,
}: MonthGridProps) {
  return (
    <div className={styles.grid}>
      <div className={styles.weekHeader}>
        {WEEKDAY_HEADERS.map((w, i) => (
          <div key={w} className={i === 0 || i === 6 ? styles.weekend : undefined}>
            {w}
          </div>
        ))}
      </div>
      <div className={styles.gridBody}>
        {weeks.map((week, wi) => (
          <div key={wi} className={styles.weekRow}>
            {week.map((day) => {
              const inMonth = day.getMonth() === month;
              const isToday = isSameDay(day, today);
              const isSelected = isSameDay(day, selectedDay);
              const events = eventsByDay.get(dayKey(day)) ?? [];
              return (
                <button
                  key={dayKey(day)}
                  type="button"
                  className={[
                    styles.dayCell,
                    inMonth ? "" : styles.dayOther,
                    isToday ? styles.dayToday : "",
                    isSelected ? styles.daySelected : "",
                  ].join(" ")}
                  onClick={() => onSelectDay(day)}
                >
                  <span className={styles.dayNum}>{day.getDate()}</span>
                  <div className={styles.dayEvents}>
                    {events.slice(0, 3).map((evt) => (
                      <span
                        key={evt.id}
                        className={styles.eventChip}
                        style={{ backgroundColor: KIND_META[evt.kind].color }}
                        title={`${formatTime(evt.start)} ${KIND_META[evt.kind].label} · ${evt.title}`}
                      >
                        <span className={styles.eventTime}>{formatTime(evt.start)}</span>
                        <span className={styles.eventTitle}>{evt.title}</span>
                      </span>
                    ))}
                    {events.length > 3 ? (
                      <span className={styles.moreChip}>+{events.length - 3}</span>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
