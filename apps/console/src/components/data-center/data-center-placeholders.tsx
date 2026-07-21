"use client";

import { useState } from "react";
import { TrendingUp } from "lucide-react";

import { DataCenterToolbar } from "@/components/data-center/data-center-toolbar";
import {
  defaultDateRange,
  type DateRangeValue,
} from "@/components/ui/date-range-picker";
import styles from "@/styles/channel-analysis.module.css";

function PlaceholderPage({ title, description, iconBg, iconColor }: {
  title: string;
  description: string;
  iconBg: string;
  iconColor: string;
}) {
  const [range, setRange] = useState<DateRangeValue>(() => defaultDateRange("30d"));

  return (
    <div className={styles.page}>
      <DataCenterToolbar range={range} onRangeChange={setRange} />
      <div className={`${styles.card} ${styles.placeholderPage}`}>
        <span className={styles.placeholderPageIcon} style={{ background: iconBg }}>
          <TrendingUp size={28} color={iconColor} />
        </span>
        <h2 className={styles.placeholderPageTitle}>{title}</h2>
        <p className={styles.placeholderPageDesc}>{description}</p>
        <span className={styles.placeholderPageBadge}>V2 功能 · 开发中</span>
      </div>
    </div>
  );
}

export function DataCenterFollowUpPlaceholder() {
  return <PlaceholderPage
    title="销售跟进分析"
    description="分析销售团队的跟进频率、转化效率与客户响应周期，优化跟进策略。"
    iconBg="#dbeafe"
    iconColor="#1e40af"
  />;
}

export function DataCenterLostReasonsPlaceholder() {
  return <PlaceholderPage
    title="丢单原因分析"
    description="统计丢单原因分布，识别关键流失节点，帮助制定针对性改进方案。"
    iconBg="#fee2e2"
    iconColor="#991b1b"
  />;
}

export function DataCenterExportPlaceholder() {
  return <PlaceholderPage
    title="经营报表导出"
    description="支持将渠道转化、销售跟进、丢单分析等经营报表导出为 PDF / Excel 格式。"
    iconBg="#dcfce7"
    iconColor="#166534"
  />;
}
