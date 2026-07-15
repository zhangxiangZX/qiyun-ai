"use client";

import { Calendar, ChevronDown, Download, RefreshCw } from "lucide-react";

import { DataCenterTabs } from "@/components/data-center/data-center-tabs";
import styles from "@/styles/channel-analysis.module.css";

export function DataCenterToolbar({
  dateLabel,
  onRefresh,
  refreshing = false,
}: {
  dateLabel: string;
  onRefresh?: () => void;
  refreshing?: boolean;
}) {
  return (
    <header className={styles.pageToolbar}>
      <div className={styles.toolbarLeft}>
        <DataCenterTabs />
      </div>
      <div className={styles.toolbarRight}>
        <div className={styles.dateRange}>
          <Calendar size={14} aria-hidden />
          {dateLabel}
          <ChevronDown size={12} aria-hidden />
        </div>
        <button
          type="button"
          className={styles.btnIcon}
          aria-label="刷新"
          onClick={onRefresh}
          disabled={refreshing}
        >
          <RefreshCw size={16} className={refreshing ? styles.spinning : undefined} aria-hidden />
        </button>
        <button type="button" className={styles.btnExport}>
          <Download size={14} aria-hidden />
          导出
        </button>
      </div>
    </header>
  );
}
