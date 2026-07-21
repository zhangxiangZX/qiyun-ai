"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";

import {
  INQUIRY_CENTER_PATH,
  INQUIRY_NEW_PATH,
} from "@/lib/sales/inquiry-nav";
import styles from "@/styles/inquiry-nav.module.css";

interface InquiryModuleNavProps {
  /** @deprecated 顶栏已展示页面名，保留参数以兼容旧调用 */
  pageTitle?: string;
  /** 右侧附加操作区 */
  actions?: React.ReactNode;
  /** 是否显示「新建询盘」按钮 */
  showNewAction?: boolean;
  /** 返回询盘列表（可携带筛选 query） */
  backHref?: string;
}

export function InquiryModuleNav({
  pageTitle: _pageTitle,
  actions,
  showNewAction = true,
  backHref = "/dashboard/inquiries",
}: InquiryModuleNavProps) {
  const pathname = usePathname();
  const isListPage = pathname === INQUIRY_CENTER_PATH;

  return (
    <div className={styles.wrap}>
      <div className={styles.left}>
        {/* 顶栏已展示页面名，子页仅保留返回链路，避免双标题 */}
        {!isListPage ? (
          <Link href={backHref} className={styles.breadcrumbLink}>
            ← 返回询盘中心
          </Link>
        ) : null}
      </div>

      <div className={styles.right}>
        {actions}
        {showNewAction && pathname !== INQUIRY_NEW_PATH ? (
          <Link href={INQUIRY_NEW_PATH} className={styles.actionPrimary}>
            <Plus size={14} />
            表单新建
          </Link>
        ) : null}
      </div>
    </div>
  );
}
