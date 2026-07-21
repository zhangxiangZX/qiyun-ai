"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";

import {
  getInquiryBreadcrumbLabel,
  INQUIRY_CENTER_PATH,
  INQUIRY_NEW_PATH,
} from "@/lib/sales/inquiry-nav";
import styles from "@/styles/inquiry-nav.module.css";

interface InquiryModuleNavProps {
  /** 覆盖默认页标题（如详情页显示客户名） */
  pageTitle?: string;
  /** 右侧附加操作区 */
  actions?: React.ReactNode;
  /** 是否显示「新建询盘」按钮 */
  showNewAction?: boolean;
}

export function InquiryModuleNav({
  pageTitle,
  actions,
  showNewAction = true,
}: InquiryModuleNavProps) {
  const pathname = usePathname();
  const crumbLabel = getInquiryBreadcrumbLabel(pathname);
  const isListPage = pathname === INQUIRY_CENTER_PATH;
  const title =
    pageTitle ??
    (isListPage
      ? "询盘中心"
      : crumbLabel ?? "询盘中心");

  return (
    <div className={styles.wrap}>
      <div className={styles.left}>
        {!isListPage ? (
          <>
            <Link href="/dashboard/inquiries" className={styles.breadcrumbLink}>
              ← 返回询盘中心
            </Link>
            <h1 className={styles.pageTitle}>{title}</h1>
          </>
        ) : null}
      </div>

      <div className={styles.right}>
        {actions}
        {showNewAction && pathname !== INQUIRY_NEW_PATH ? (
          <Link href={INQUIRY_NEW_PATH} className={styles.actionPrimary}>
            <Plus size={14} />
            新建询盘
          </Link>
        ) : null}
      </div>
    </div>
  );
}
