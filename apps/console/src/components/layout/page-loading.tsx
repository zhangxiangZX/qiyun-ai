"use client";

import { cn } from "@qiyun/ui";

import styles from "@/styles/page-loading.module.css";

interface PageLoadingProps {
  className?: string;
  /** Compact mode for nested Suspense / overlay */
  compact?: boolean;
}

/** Quiet console wait mark — thin arc only, no copy, no card. */
export function PageLoading({ className, compact = false }: PageLoadingProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="页面加载中"
      data-page-loading="true"
      className={cn(styles.wrap, compact ? styles.wrapCompact : styles.wrapFull, className)}
    >
      <svg
        className={cn(styles.spinner, compact && styles.spinnerCompact)}
        viewBox="0 0 40 40"
        aria-hidden
      >
        <circle className={styles.track} cx="20" cy="20" r="16" />
        <circle className={styles.arc} cx="20" cy="20" r="16" />
      </svg>
    </div>
  );
}

export default PageLoading;
