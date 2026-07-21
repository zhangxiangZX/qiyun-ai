"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Link2, QrCode } from "lucide-react";

import { QrcodeManagementWorkspace } from "@/components/channels/qrcode-management-workspace";
import { SalesLinksWorkspace } from "@/components/channels/sales-links-workspace";

/**
 * 获客链接统一入口：销售链接与二维码同一实体，用 Tab 区分展示，避免侧栏双入口。
 */
export function SalesAcquisitionHub() {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") === "qrcode" ? "qrcode" : "links";

  return (
    <div className="space-y-0">
      <div className="flex flex-wrap items-center gap-2 border-b border-border bg-card px-4 pt-3 sm:px-6 lg:px-page">
        <Link
          href="/dashboard/channels/links"
          className={`inline-flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
            tab === "links"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Link2 size={14} aria-hidden />
          销售链接
        </Link>
        <Link
          href="/dashboard/channels/links?tab=qrcode"
          className={`inline-flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
            tab === "qrcode"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <QrCode size={14} aria-hidden />
          二维码
        </Link>
      </div>
      {tab === "qrcode" ? <QrcodeManagementWorkspace /> : <SalesLinksWorkspace />}
    </div>
  );
}
