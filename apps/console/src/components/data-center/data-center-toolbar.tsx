"use client";

import Link from "next/link";
import { Download, RefreshCw } from "lucide-react";

import {
  DateRangePicker,
  resolveDateRangeBounds,
  type DateRangeValue,
} from "@/components/ui/date-range-picker";
import styles from "@/styles/channel-analysis.module.css";

export function DataCenterToolbar({
  range,
  onRangeChange,
  onRefresh,
  refreshing = false,
  exportHref = "/dashboard/reports/export",
}: {
  range: DateRangeValue;
  onRangeChange: (value: DateRangeValue) => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  /** When set, toolbar 导出 navigates here. Pass empty string to hide. */
  exportHref?: string;
}) {
  const bounds = resolveDateRangeBounds(range);

  return (
    <header className={styles.pageToolbar}>
      <div className={styles.toolbarLeft} />
      <div className={styles.toolbarRight}>
        <DateRangePicker value={range} onChange={onRangeChange} align="right" />
        <button
          type="button"
          className={styles.btnIcon}
          aria-label={`刷新（当前 ${bounds.label}）`}
          onClick={onRefresh}
          disabled={!onRefresh || refreshing}
        >
          <RefreshCw size={16} className={refreshing ? styles.spinning : undefined} aria-hidden />
        </button>
        {exportHref ? (
          <Link href={exportHref} className={styles.btnExport}>
            <Download size={14} aria-hidden />
            导出
          </Link>
        ) : null}
      </div>
    </header>
  );
}
