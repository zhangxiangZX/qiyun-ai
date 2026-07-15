"use client";

import type { ComponentType, ReactNode } from "react";
import { CalendarDays, RefreshCw, TrendingDown, TrendingUp } from "lucide-react";

import styles from "@/styles/role-home.module.css";

export function RoleHomeToolbar({
  compact = false,
  refreshing,
  onRefresh,
}: {
  compact?: boolean;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  return (
    <div className={styles.toolbar}>
      <button type="button" className={styles.dateButton}>
        <CalendarDays size={16} />
        {compact ? "2024-06-01" : "2024-06-01 ~ 2024-06-30"}
        <span>⌄</span>
      </button>
      <button type="button" className={styles.refreshButton} onClick={onRefresh} disabled={refreshing}>
        <RefreshCw size={16} className={refreshing ? styles.spinning : undefined} />刷新
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
            <span className={styles.kpiIcon} data-tone={tones[index]}><Icon size={23} /></span>
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
