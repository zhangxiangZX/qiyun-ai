"use client";

import { Lock } from "lucide-react";

import { TeamSettingsTabs } from "@/components/team/team-settings-tabs";
import styles from "@/styles/team-management.module.css";

export default function TeamSecurityPage() {
  return (
    <div className={styles.main}>
      <TeamSettingsTabs active="security" />
      <div className={styles.cardSection}>
        <div className={styles.placeholderSection}>
          <span className={`${styles.placeholderIcon} bg-warning/10`}>
            <Lock size={28} color="#92400e" />
          </span>
          <h2 className={styles.placeholderTitle}>安全设置</h2>
          <p className={styles.placeholderDesc}>
            安全设置包括密码策略、登录保护、IP 白名单等，保障企业数据与账号安全。
          </p>
          <span className={styles.placeholderBadge}>V2 功能 · 即将上线</span>
        </div>
      </div>
    </div>
  );
}
