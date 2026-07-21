"use client";

import type { ComponentType, ReactNode } from "react";
import { useState } from "react";
import { RefreshCw, TrendingDown, TrendingUp } from "lucide-react";

import {
  DateRangePicker,
  defaultDateRange,
  type DateRangeValue,
} from "@/components/ui/date-range-picker";
import styles from "@/styles/role-home.module.css";

export function RoleHomeToolbar({
  compact = false,
  refreshing,
  onRefresh,
  range,
  onRangeChange,
}: {
  compact?: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  range?: DateRangeValue;
  onRangeChange?: (value: DateRangeValue) => void;
}) {
  const [internalRange, setInternalRange] = useState<DateRangeValue>(() =>
    defaultDateRange(compact ? "7d" : "30d"),
  );
  const value = range ?? internalRange;
  const setValue = onRangeChange ?? setInternalRange;

  return (
    <div className={styles.toolbar}>
      <DateRangePicker value={value} onChange={setValue} align="right" />
      <button type="button" className={styles.refreshButton} onClick={onRefresh} disabled={refreshing}>
        <RefreshCw size={16} className={refreshing ? styles.spinning : undefined} />
        刷新
      </button>
    </div>
  );
}

export function RoleKpiStrip({
  items,
  icons,
  tones,
}: {
  items: Array<{ label: string; value: string; trendValue: string; trendDirection: "up" | "down"; trendPct: string }>;
  icons: Array<ComponentType<{ size?: number }>>;
  tones: string[];
}) {
  return (
    <section className={styles.kpiGrid} aria-label="关键指标">
      {items.map((item, index) => {
        const Icon = icons[index];
        return (
          <article className={styles.kpiCard} key={item.label}>
            <span className={styles.kpiIcon} data-tone={tones[index]}><Icon size={22} /></span>
            <div className={styles.kpiContent}>
              <p>{item.label}</p><strong>{item.value}</strong>
              <small>
                <span>{item.trendValue}</span>
                <b data-negative={item.trendDirection === "down"}>
                  {item.trendDirection === "down" ? <TrendingDown size={11} /> : <TrendingUp size={11} />}
                  {item.trendPct.replace("+", "")}
                </b>
              </small>
            </div>
          </article>
        );
      })}
    </section>
  );
}

export function RoleCardHeader({ title, action }: { title: string; action?: ReactNode }) {
  return <div className={styles.cardHeader}><h2>{title}</h2>{action}</div>;
}

export function RoleDonut({
  segments,
  label,
  sublabel,
  size = 120,
}: {
  segments: Array<{ value: number; color: string }>;
  label: string;
  sublabel: string;
  size?: number;
}) {
  const total = segments.reduce((sum, item) => sum + item.value, 0) || 1;
  const gradient = `${segments.reduce((result, item, index, all) => {
    const before = all.slice(0, index).reduce((sum, entry) => sum + entry.value, 0);
    return `${result}${index ? "," : ""}${item.color} ${(before / total) * 100}% ${((before + item.value) / total) * 100}%`;
  }, "conic-gradient(")})`;
  return (
    <div className={styles.donut} style={{ width: size, height: size, background: gradient }}>
      <div><strong>{label}</strong><span>{sublabel}</span></div>
    </div>
  );
}
