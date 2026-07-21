"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@qiyun/ui";

import styles from "@/styles/date-range-picker.module.css";

export type DateRangeMode = "7d" | "30d" | "custom";

export type DateRangeValue = {
  mode: DateRangeMode;
  from: string;
  to: string;
};

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"] as const;

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function shiftIsoDays(baseIso: string, delta: number): string {
  const date = new Date(`${baseIso}T00:00:00`);
  date.setDate(date.getDate() + delta);
  return toIsoDate(date);
}

export function todayIso(): string {
  return toIsoDate(new Date());
}

export function defaultDateRange(mode: DateRangeMode = "7d"): DateRangeValue {
  const to = todayIso();
  if (mode === "30d") return { mode, from: shiftIsoDays(to, -29), to };
  return { mode: "7d", from: shiftIsoDays(to, -6), to };
}

export function resolveDateRangeBounds(range: DateRangeValue): {
  from: string;
  to: string;
  days: number;
  label: string;
} {
  const to = todayIso();
  if (range.mode === "7d") {
    return { from: shiftIsoDays(to, -6), to, days: 7, label: "近7天" };
  }
  if (range.mode === "30d") {
    return { from: shiftIsoDays(to, -29), to, days: 30, label: "近30天" };
  }
  const days = Math.max(
    1,
    Math.ceil((Date.parse(range.to) - Date.parse(range.from)) / 86400000) + 1,
  );
  return { from: range.from, to: range.to, days, label: `${range.from} ~ ${range.to}` };
}

function monthMatrix(year: number, month: number): Array<Date | null> {
  const first = new Date(year, month, 1);
  const startPad = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<Date | null> = [];
  for (let i = 0; i < startPad; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(year, month, day));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function inRange(iso: string, from: string, to: string) {
  return iso >= from && iso <= to;
}

type DateRangePickerProps = {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
  className?: string;
  align?: "left" | "right";
};

export function DateRangePicker({
  value,
  onChange,
  className,
  align = "left",
}: DateRangePickerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateRangeValue>(value);
  const [picking, setPicking] = useState<"from" | "to">("from");
  const bounds = useMemo(() => resolveDateRangeBounds(value), [value]);

  const initialMonth = useMemo(() => {
    const source = value.mode === "custom" ? value.to : todayIso();
    const d = new Date(`${source}T00:00:00`);
    return { year: d.getFullYear(), month: d.getMonth() };
  }, [value]);

  const [view, setView] = useState(initialMonth);

  useEffect(() => {
    if (!open) return;
    setDraft(value);
    setPicking("from");
    setView(initialMonth);
  }, [open, value, initialMonth]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const cells = useMemo(
    () => monthMatrix(view.year, view.month),
    [view.year, view.month],
  );

  const draftFrom = draft.from;
  const draftTo = draft.to;

  function applyPreset(mode: "7d" | "30d") {
    const next = defaultDateRange(mode);
    onChange(next);
    setOpen(false);
  }

  function selectDay(iso: string) {
    setDraft((prev) => {
      if (picking === "from" || iso < prev.from) {
        setPicking("to");
        return { mode: "custom", from: iso, to: iso };
      }
      setPicking("from");
      return { mode: "custom", from: prev.from, to: iso };
    });
  }

  function confirm() {
    const next =
      draft.mode === "custom"
        ? {
            mode: "custom" as const,
            from: draft.from <= draft.to ? draft.from : draft.to,
            to: draft.from <= draft.to ? draft.to : draft.from,
          }
        : defaultDateRange(draft.mode);
    onChange(next);
    setOpen(false);
  }

  function reset() {
    const next = defaultDateRange("7d");
    onChange(next);
    setOpen(false);
  }

  return (
    <div className={cn(styles.root, className)} ref={rootRef}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <CalendarDays size={17} aria-hidden />
        <span>{bounds.label}</span>
        <ChevronDown size={16} className={styles.chevron} aria-hidden />
      </button>

      {open ? (
        <div
          className={cn(styles.panel, align === "right" && styles.panelRight)}
          role="dialog"
          aria-label="选择日期范围"
        >
          <div className={styles.presetList}>
            <button
              type="button"
              className={draft.mode === "7d" ? styles.presetActive : styles.preset}
              onClick={() => applyPreset("7d")}
            >
              近7天
            </button>
            <button
              type="button"
              className={draft.mode === "30d" ? styles.presetActive : styles.preset}
              onClick={() => applyPreset("30d")}
            >
              近30天
            </button>
            <button
              type="button"
              className={draft.mode === "custom" ? styles.presetActive : styles.preset}
              onClick={() =>
                setDraft((prev) => ({
                  mode: "custom",
                  from: prev.from,
                  to: prev.to,
                }))
              }
            >
              自定义
            </button>
          </div>

          {draft.mode === "custom" ? (
            <div className={styles.calendar}>
              <div className={styles.calHeader}>
                <button
                  type="button"
                  className={styles.navBtn}
                  aria-label="上个月"
                  onClick={() =>
                    setView((v) => {
                      const d = new Date(v.year, v.month - 1, 1);
                      return { year: d.getFullYear(), month: d.getMonth() };
                    })
                  }
                >
                  <ChevronLeft size={16} />
                </button>
                <strong>
                  {view.year} 年 {view.month + 1} 月
                </strong>
                <button
                  type="button"
                  className={styles.navBtn}
                  aria-label="下个月"
                  onClick={() =>
                    setView((v) => {
                      const d = new Date(v.year, v.month + 1, 1);
                      return { year: d.getFullYear(), month: d.getMonth() };
                    })
                  }
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              <div className={styles.weekdays}>
                {WEEKDAYS.map((w) => (
                  <span key={w}>{w}</span>
                ))}
              </div>

              <div className={styles.days}>
                {cells.map((date, index) => {
                  if (!date) return <span key={`e-${index}`} />;
                  const iso = toIsoDate(date);
                  const selectedStart = iso === draftFrom;
                  const selectedEnd = iso === draftTo;
                  const selected = selectedStart || selectedEnd;
                  const between =
                    draftFrom !== draftTo && inRange(iso, draftFrom, draftTo) && !selected;
                  const isToday = iso === todayIso();
                  return (
                    <button
                      key={iso}
                      type="button"
                      className={cn(
                        styles.day,
                        selected && styles.daySelected,
                        between && styles.dayInRange,
                        isToday && styles.dayToday,
                      )}
                      onClick={() => selectDay(iso)}
                    >
                      {date.getDate()}
                    </button>
                  );
                })}
              </div>

              <p className={styles.hint}>
                {picking === "from" ? "选择开始日期" : "选择结束日期"}
                <span>
                  {draftFrom}
                  {draftFrom !== draftTo ? ` ~ ${draftTo}` : ""}
                </span>
              </p>
            </div>
          ) : null}

          <div className={styles.actions}>
            <button type="button" className={styles.reset} onClick={reset}>
              重置
            </button>
            <button type="button" className={styles.confirm} onClick={confirm}>
              确定
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
