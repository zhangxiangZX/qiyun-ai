"use client";

import Link from "next/link";

import styles from "@/styles/team-management.module.css";

type SettingsTab = "team" | "roles" | "profile" | "billing" | "security" | "status" | "audit";

const TABS: Array<{ id: SettingsTab; label: string; href: string; v2?: boolean }> = [
  { id: "team", label: "团队成员", href: "/dashboard/team" },
  { id: "roles", label: "角色权限", href: "/dashboard/team/roles" },
  { id: "profile", label: "企业资料", href: "/dashboard/team/profile" },
  { id: "billing", label: "套餐与账单", href: "/dashboard/team/billing", v2: true },
  { id: "security", label: "安全设置", href: "/dashboard/team/security", v2: true },
  { id: "status", label: "系统状态", href: "/dashboard/system-status" },
  { id: "audit", label: "操作日志", href: "/dashboard/logs" },
];

const V1_SETTINGS_TABS = TABS.filter((tab) => !tab.v2);

export function TeamSettingsTabs({ active }: { active: SettingsTab }) {
  return (
    <nav className={styles.pageTabs} aria-label="系统设置">
      {V1_SETTINGS_TABS.map((tab) => (
        <Link
          key={tab.id}
          href={tab.href}
          className={active === tab.id ? `${styles.pageTab} ${styles.pageTabActive}` : styles.pageTab}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
