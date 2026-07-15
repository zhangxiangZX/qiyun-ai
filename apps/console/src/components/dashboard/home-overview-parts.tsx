"use client";

import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Bot,
  CircleDollarSign,
  ClipboardList,
  Clock,
  Eye,
  FilePlus2,
  Flame,
  Link2,
  MessageCircle,
  MessageSquare,
  PhoneCall,
  TrendingUp,
  Upload,
  UserCheck,
  UserPlus,
} from "lucide-react";

import styles from "@/styles/home-overview.module.css";

/**
 * 统一图标素材：首页概览/销售漏斗的 KPI·任务·快捷入口图标全部收敛到 lucide-react。
 * 保留 src 入参以兼容现有数据结构，按资产文件名映射到对应 lucide 图标；未知 src 回退到图片。
 */
const ICON_BY_ASSET: Record<string, LucideIcon> = {
  "15_kpi_valid_inquiry": MessageCircle,
  "16_kpi_high_intent": Flame,
  "17_kpi_pending_quote": ClipboardList,
  "18_kpi_revenue": CircleDollarSign,
  "19_kpi_response_time": Clock,
  "20_task_follow_customer": UserCheck,
  "21_task_pending_quote": ClipboardList,
  "22_task_pending_message": MessageSquare,
  "23_task_pending_review": Eye,
  "24_task_callback": PhoneCall,
  "25_quick_create_assistant": Bot,
  "26_quick_upload_material": Upload,
  "27_quick_create_quote": FilePlus2,
  "28_quick_generate_link": Link2,
  "29_quick_invite_member": UserPlus,
  "30_quick_view_report": BarChart3,
  "43_growth_tag": TrendingUp,
};

function assetKey(src: string): string {
  const base = src.split("/").pop() ?? "";
  return base.replace(/\.svg$/, "");
}

export function HomeAssetIcon({
  src,
  size = 48,
  className,
}: {
  src: string;
  size?: number;
  className?: string;
}) {
  const Icon = ICON_BY_ASSET[assetKey(src)];
  if (Icon) {
    return (
      <span
        className={className ?? styles.assetIcon}
        style={{
          width: size,
          height: size,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon size={Math.round(size * 0.66)} aria-hidden />
      </span>
    );
  }
  return (
    <span className={className ?? styles.assetIcon} style={{ width: size, height: size }}>
      <img src={src} alt="" width={size} height={size} draggable={false} />
    </span>
  );
}

export function HomeStarRating({ value }: { value: number }) {
  const filled = Math.max(0, Math.min(5, value));
  return (
    <span className={styles.starRating} aria-label={`${filled} 星意向`}>
      {Array.from({ length: 5 }).map((_, index) => (
        <span key={index} className={index < filled ? styles.starFilled : styles.starEmpty}>
          ★
        </span>
      ))}
    </span>
  );
}

export function HomeKpiTrend({ text, good }: { text: string; good: boolean }) {
  return (
    <small className={good ? styles.kpiTrendUp : styles.kpiTrendDown}>
      {text}
    </small>
  );
}

export function HomeTablePagination({
  from,
  to,
  total,
  pageSize = 5,
  currentPage = 1,
  onPageChange,
}: {
  from: number;
  to: number;
  total: number;
  pageSize?: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = Math.max(1, Math.min(currentPage - 1, totalPages - 2));
  const pages = Array.from(
    { length: Math.min(3, totalPages) },
    (_, index) => start + index,
  );

  return (
    <div className={styles.pagination}>
      <span>
        显示 {from}-{to} 条，共 {total} 条
      </span>
      <div className={styles.paginationNav}>
        <button
          type="button"
          className={styles.paginationPrev}
          aria-label="上一页"
          disabled={currentPage <= 1}
          onClick={() => onPageChange?.(Math.max(1, currentPage - 1))}
        >
          ‹
        </button>
        {pages.map((page) => (
          <button
            key={page}
            type="button"
            className={page === currentPage ? styles.pageActive : styles.pageNumber}
            aria-current={page === currentPage ? "page" : undefined}
            onClick={() => onPageChange?.(page)}
          >
            {page}
          </button>
        ))}
        <button
          type="button"
          className={styles.paginationNext}
          aria-label="下一页"
          disabled={totalPages <= 1 || currentPage >= totalPages}
          onClick={() => onPageChange?.(Math.min(totalPages, currentPage + 1))}
        >
          ›
        </button>
      </div>
    </div>
  );
}
