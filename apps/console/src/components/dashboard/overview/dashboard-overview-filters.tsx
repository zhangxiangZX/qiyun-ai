"use client";

import { CalendarDays, ChevronDown } from "lucide-react";

import { t } from "@/lib/i18n";
import { defaultLocale } from "@/lib/messages";
import styles from "@/styles/dashboard-overview.module.css";

export interface DashboardOverviewFiltersProps {
  dateRange: string;
  dateRangeOptions: string[];
  robotFilter: string;
  robotOptions: string[];
  dateRangeDisabled?: boolean;
  onDateRangeChange: (value: string) => void;
  onRobotFilterChange: (value: string) => void;
}

export function DashboardOverviewFilters({
  dateRange,
  dateRangeOptions,
  robotFilter,
  robotOptions,
  dateRangeDisabled = false,
  onDateRangeChange,
  onRobotFilterChange,
}: DashboardOverviewFiltersProps) {
  return (
    <div className={styles.filters}>
      <label
        className={`${styles.filterPill} ${dateRangeDisabled ? styles.filterPillDisabled : ""}`}
        title={
          dateRangeDisabled
            ? t(defaultLocale, "mode.filters.previewDisabled")
            : "统计周期筛选"
        }
      >
        <CalendarDays className={styles.filterIcon} aria-hidden />
        <select
          value={dateRange}
          disabled={dateRangeDisabled}
          aria-label="日期范围"
          onChange={(event) => onDateRangeChange(event.target.value)}
        >
          {dateRangeOptions.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
        <ChevronDown className={styles.filterChevron} aria-hidden />
      </label>

      <label className={`${styles.filterPill} ${styles.filterPillRobot}`}>
        <select
          value={robotFilter}
          onChange={(event) => onRobotFilterChange(event.target.value)}
          aria-label="机器人筛选"
        >
          {robotOptions.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
        <ChevronDown className={styles.filterChevron} aria-hidden />
      </label>
    </div>
  );
}
