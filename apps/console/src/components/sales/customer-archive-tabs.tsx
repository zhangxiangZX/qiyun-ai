"use client";

import Link from "next/link";

import styles from "@/styles/customer-archive.module.css";

type CustomerTab = "archive" | "detail" | "ops";

const TABS: Array<{ id: CustomerTab; label: string; href: string }> = [
  { id: "archive", label: "客户档案", href: "/dashboard/customers" },
  { id: "detail", label: "客户详情", href: "/dashboard/customers/detail" },
  { id: "ops", label: "客户运营", href: "/dashboard/customers/ops" },
];

export function CustomerArchiveTabs({ active }: { active: CustomerTab }) {
  return (
    <nav className={styles.pageTabs} aria-label="客户与运营">
      {TABS.map((tab) => (
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
