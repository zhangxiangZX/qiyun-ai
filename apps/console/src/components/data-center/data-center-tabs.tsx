"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import styles from "@/styles/channel-analysis.module.css";

const TABS = [
  { id: "funnel", label: "成交漏斗", href: "/dashboard/sales" },
  { id: "channels", label: "渠道分析", href: "/dashboard/reports/channel" },
  { id: "follow-up", label: "销售跟进分析", href: "/dashboard/reports/follow-up" },
  { id: "lost-reasons", label: "丢单原因分析", href: "/dashboard/reports/lost-reasons" },
  { id: "export", label: "报表导出", href: "/dashboard/reports/export" },
] as const;

function isTabActive(pathname: string, href: string): boolean {
  if (href === "/dashboard/sales") {
    return pathname === "/dashboard/sales" || pathname.startsWith("/dashboard/sales/");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DataCenterTabs() {
  const pathname = usePathname();

  return (
    <nav className={styles.headerTabs} aria-label="数据中心">
      {TABS.map((tab) => (
        <Link
          key={tab.id}
          href={tab.href}
          className={isTabActive(pathname, tab.href) ? styles.headerTabActive : styles.headerTab}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
