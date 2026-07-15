"use client";

import { CreditCard } from "lucide-react";

import { TeamSettingsTabs } from "@/components/team/team-settings-tabs";
import styles from "@/styles/team-management.module.css";

export default function TeamBillingPage() {
  return (
    <div className={styles.main}>
      <TeamSettingsTabs active="billing" />
      <div className={styles.cardSection}>
        <div className={styles.placeholderSection}>
          <span className={styles.placeholderIcon} style={{ background: "#dcfce7" }}>
            <CreditCard size={28} color="#166534" />
          </span>
          <h2 className={styles.placeholderTitle}>套餐与账单</h2>
          <p className={styles.placeholderDesc}>
            套餐与账单管理让您查看当前套餐详情、用量统计和账单历史，支持套餐升级与续费。
          </p>
          <span className={styles.placeholderBadge}>V2 功能 · 即将上线</span>
        </div>
      </div>
    </div>
  );
}
