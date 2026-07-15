"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Calendar as CalendarIcon,
  List,
  Sparkles,
} from "lucide-react";

import { Skeleton } from "@qiyun/ui";

import { ConsoleModeBadge } from "@/components/console/console-data-mode-banner";
import { ConsoleRequestError } from "@/components/console/console-request-error";
import { getApiErrorMessage } from "@/lib/api/errors";
import { getCalendarCapabilities } from "@/lib/calendar/capabilities";
import { listCalendarEvents } from "@/lib/calendar/data";
import { MonthGrid } from "@/components/calendar/month-grid";
import {
  CALENDAR_KINDS,
  KIND_META,
  buildMonthMatrix,
  dayKey,
  formatDayLabel,
  formatMonthLabel,
  formatTime,
  formatWeekdayShort,
} from "@/lib/calendar/calendar-utils";
import type {
  CalendarCapabilities,
  CalendarEvent,
  CalendarEventKind,
  CalendarViewMode,
} from "@/lib/calendar/types";
import { t } from "@/lib/i18n";
import { defaultLocale } from "@/lib/messages";
import styles from "@/styles/calendar.module.css";

const today = new Date();

type LoadState = "loading" | "ready" | "error";

function EventRow({ evt }: { evt: CalendarEvent }) {
  const meta = KIND_META[evt.kind];
  const d = new Date(evt.start);
  return (
    <div className={styles.eventItem}>
      <span className={styles.eventDot} style={{ backgroundColor: meta.color }} />
      <div className={styles.eventBody}>
        <div className={styles.eventTop}>
          <span className={styles.eventTime2}>{formatTime(evt.start)}</span>
          <span className={styles.eventKindTag} style={{ color: meta.color }}>
            {meta.label}
          </span>
          {evt.status === "done" ? (
            <span className={styles.tagDone}>已完成</span>
          ) : evt.status === "cancelled" ? (
            <span className={styles.tagCancelled}>已取消</span>
          ) : null}
        </div>
        <div className={styles.eventTitle2}>{evt.title}</div>
        <div className={styles.eventMeta}>
          {formatDayLabel(d)} {formatWeekdayShort(d)}
          {evt.leadName ? ` · ${evt.leadName}` : ""}
          {evt.ownerName ? ` · ${evt.ownerName}` : ""}
        </div>
      </div>
    </div>
  );
}

export function CalendarWorkspace() {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [listError, setListError] = useState<string | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [capabilities, setCapabilities] = useState<CalendarCapabilities | null>(null);

  const [viewMonth, setViewMonth] = useState<Date>(
    new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [selectedDay, setSelectedDay] = useState<Date>(
    new Date(today.getFullYear(), today.getMonth(), today.getDate()),
  );
  const [viewMode, setViewMode] = useState<CalendarViewMode>("month");
  const [kindFilter, setKindFilter] = useState<Set<CalendarEventKind>>(new Set());

  const load = useCallback(async () => {
    setLoadState("loading");
    setListError(null);
    try {
      const from = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
      const to = new Date(
        today.getFullYear(),
        today.getMonth() + 3,
        0,
        23,
        59,
        59,
      ).toISOString();
      const [nextCaps, data] = await Promise.all([
        getCalendarCapabilities(),
        listCalendarEvents(from, to),
      ]);
      setCapabilities(nextCaps);
      setEvents(data);
      setLoadState("ready");
    } catch (error) {
      setListError(getApiErrorMessage(error, t(defaultLocale, "calendar.error.load")));
      setLoadState("error");
      setEvents([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visibleEvents = useMemo(
    () => events.filter((e) => kindFilter.size === 0 || kindFilter.has(e.kind)),
    [events, kindFilter],
  );

  const weeks = useMemo(
    () => buildMonthMatrix(viewMonth.getFullYear(), viewMonth.getMonth()),
    [viewMonth],
  );

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const evt of visibleEvents) {
      const key = dayKey(new Date(evt.start));
      const arr = map.get(key) ?? [];
      arr.push(evt);
      map.set(key, arr);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
    }
    return map;
  }, [visibleEvents]);

  const kpis = useMemo(() => {
    let monthCount = 0;
    let pending = 0;
    let done = 0;
    let overdue = 0;
    for (const e of visibleEvents) {
      const d = new Date(e.start);
      if (d.getFullYear() === viewMonth.getFullYear() && d.getMonth() === viewMonth.getMonth()) {
        monthCount += 1;
      }
      if (e.status === "done") {
        done += 1;
      } else if (e.status === "pending") {
        pending += 1;
        if (d.getTime() < today.getTime()) overdue += 1;
      }
    }
    return { monthCount, pending, done, overdue };
  }, [visibleEvents, viewMonth]);

  const upcoming = useMemo(() => {
    return visibleEvents
      .filter((e) => new Date(e.start).getTime() >= today.getTime() - 24 * 3600 * 1000)
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  }, [visibleEvents]);

  const selectedDayEvents = useMemo(
    () => eventsByDay.get(dayKey(selectedDay)) ?? [],
    [eventsByDay, selectedDay],
  );

  const kindCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const e of events) {
      counts[e.kind] = (counts[e.kind] ?? 0) + 1;
    }
    return counts;
  }, [events]);

  function goPrev() {
    setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1));
  }
  function goNext() {
    setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1));
  }
  function goToday() {
    setViewMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDay(new Date(today.getFullYear(), today.getMonth(), today.getDate()));
  }
  function toggleKind(kind: CalendarEventKind) {
    setKindFilter((prev) => {
      const next = new Set(prev);
      if (next.has(kind)) next.delete(kind);
      else next.add(kind);
      return next;
    });
  }

  if (loadState === "loading") {
    return (
      <div className={styles.page}>
        <p className={styles.loadingText}>加载日历…</p>
        <Skeleton className="h-20 rounded-card" />
        <Skeleton className="h-96 rounded-card" />
      </div>
    );
  }

  if (loadState === "error") {
    return (
      <div className={styles.page}>
        <header className={styles.pageHeader}>
          <h1>{t(defaultLocale, "calendar.title")}</h1>
          <p>{t(defaultLocale, "calendar.description")}</p>
        </header>
        <ConsoleRequestError
          message={listError ?? t(defaultLocale, "calendar.error.load")}
          onRetry={() => void load()}
          retryLabel={t(defaultLocale, "dashboard.error.retry")}
        />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div className={styles.titleRow}>
          <div>
            <h1>{t(defaultLocale, "calendar.title")}</h1>
            <p>{t(defaultLocale, "calendar.description")}</p>
          </div>
          <span className={styles.previewBadge}>
            <Sparkles size={12} aria-hidden /> {t(defaultLocale, "calendar.previewBadge")}
          </span>
        </div>
      </header>

      <div className={`${styles.kpiGrid} ui-stagger-fade-in ui-hover-lift-children`}>
        <article className={styles.kpiCard}>
          <div className={styles.kpiInner}>
            <div>
              <div className={styles.kpiLabel}>{t(defaultLocale, "calendar.kpi.month")}</div>
              <div className={styles.kpiValue}>{kpis.monthCount}</div>
            </div>
            <div className={`${styles.kpiIcon} bg-[#3b5eff] text-white`}>
              <CalendarDays size={20} aria-hidden />
            </div>
          </div>
        </article>
        <article className={styles.kpiCard}>
          <div className={styles.kpiInner}>
            <div>
              <div className={styles.kpiLabel}>{t(defaultLocale, "calendar.kpi.pending")}</div>
              <div className={styles.kpiValue}>{kpis.pending}</div>
            </div>
            <div className={`${styles.kpiIcon} bg-[#f97316] text-white`}>
              <Clock size={20} aria-hidden />
            </div>
          </div>
        </article>
        <article className={styles.kpiCard}>
          <div className={styles.kpiInner}>
            <div>
              <div className={styles.kpiLabel}>{t(defaultLocale, "calendar.kpi.done")}</div>
              <div className={styles.kpiValue}>{kpis.done}</div>
            </div>
            <div className={`${styles.kpiIcon} bg-[#22c55e] text-white`}>
              <CheckCircle2 size={20} aria-hidden />
            </div>
          </div>
        </article>
        <article className={styles.kpiCard}>
          <div className={styles.kpiInner}>
            <div>
              <div className={styles.kpiLabel}>{t(defaultLocale, "calendar.kpi.overdue")}</div>
              <div className={styles.kpiValue}>{kpis.overdue}</div>
            </div>
            <div className={`${styles.kpiIcon} bg-[#ef4444] text-white`}>
              <AlertTriangle size={20} aria-hidden />
            </div>
          </div>
        </article>
      </div>

      <div className={styles.topActions}>
        <ConsoleModeBadge />
      </div>

      {capabilities?.dataMode === "upstream" && capabilities.upstreamNote ? (
        <p className={styles.upstreamNote}>{capabilities.upstreamNote}</p>
      ) : null}

      <div className={`${styles.gridMain} ui-stagger-fade-in ui-hover-lift-children`}>
        <div className={styles.mainCol}>
          <article className={styles.card}>
            <div className={styles.cardTitleRow}>
              <div className={styles.toolbar}>
                <div className={styles.navGroup}>
                  <button
                    type="button"
                    className={styles.navBtn}
                    onClick={goPrev}
                    aria-label={t(defaultLocale, "calendar.prev")}
                  >
                    <ChevronLeft size={16} aria-hidden />
                  </button>
                  <button type="button" className={styles.navBtn} onClick={goToday}>
                    {t(defaultLocale, "calendar.today")}
                  </button>
                  <button
                    type="button"
                    className={styles.navBtn}
                    onClick={goNext}
                    aria-label={t(defaultLocale, "calendar.next")}
                  >
                    <ChevronRight size={16} aria-hidden />
                  </button>
                </div>
                <div className={styles.monthLabel}>
                  {formatMonthLabel(viewMonth.getFullYear(), viewMonth.getMonth())}
                </div>
                <div className={styles.viewToggle}>
                  <button
                    type="button"
                    className={viewMode === "month" ? styles.viewBtnActive : styles.viewBtn}
                    onClick={() => setViewMode("month")}
                  >
                    <CalendarIcon size={14} aria-hidden />
                    {t(defaultLocale, "calendar.view.month")}
                  </button>
                  <button
                    type="button"
                    className={viewMode === "upcoming" ? styles.viewBtnActive : styles.viewBtn}
                    onClick={() => setViewMode("upcoming")}
                  >
                    <List size={14} aria-hidden />
                    {t(defaultLocale, "calendar.view.upcoming")}
                  </button>
                </div>
              </div>
            </div>

            {viewMode === "month" ? (
              <div className={styles.gridScroll}>
                <MonthGrid
                  weeks={weeks}
                  month={viewMonth.getMonth()}
                  today={today}
                  selectedDay={selectedDay}
                  eventsByDay={eventsByDay}
                  onSelectDay={setSelectedDay}
                />
              </div>
            ) : (
              <div className={styles.eventList}>
                {upcoming.length === 0 ? (
                  <p className={styles.emptyHint}>{t(defaultLocale, "calendar.upcomingEmpty")}</p>
                ) : (
                  upcoming.map((evt) => <EventRow key={evt.id} evt={evt} />)
                )}
              </div>
            )}
          </article>
        </div>

        <aside className={styles.sidebarCol}>
          <article className={styles.card}>
            <h2 className={styles.cardTitle}>{t(defaultLocale, "calendar.legend")}</h2>
            <div className={styles.legend}>
              {CALENDAR_KINDS.map((kind) => {
                const meta = KIND_META[kind];
                const active = kindFilter.has(kind);
                const dimmed = kindFilter.size > 0 && !active;
                return (
                  <button
                    key={kind}
                    type="button"
                    className={`${styles.legendItem} ${active ? styles.legendActive : ""} ${
                      dimmed ? styles.legendDimmed : ""
                    }`}
                    onClick={() => toggleKind(kind)}
                  >
                    <span className={styles.legendDot} style={{ backgroundColor: meta.color }} />
                    <span className={styles.legendLabel}>{meta.label}</span>
                    <span className={styles.legendCount}>{kindCounts[kind] ?? 0}</span>
                  </button>
                );
              })}
            </div>
          </article>

          <article className={styles.card}>
            <div className={styles.cardTitleRow}>
              <h2 className={styles.cardTitle}>{t(defaultLocale, "calendar.selectedDay")}</h2>
              <span className={styles.dayPill}>
                {formatDayLabel(selectedDay)} {formatWeekdayShort(selectedDay)}
              </span>
            </div>
            <div className={styles.eventList}>
              {selectedDayEvents.length === 0 ? (
                <p className={styles.emptyHint}>{t(defaultLocale, "calendar.noEventsDay")}</p>
              ) : (
                selectedDayEvents.map((evt) => <EventRow key={evt.id} evt={evt} />)
              )}
            </div>
          </article>
        </aside>
      </div>
    </div>
  );
}
