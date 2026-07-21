"use client";

import { Download } from "lucide-react";

import { useEnterpriseLogo } from "@/hooks/use-enterprise-logo";

/** 导出 PDF / 文件按钮图标：有企业 Logo 则显示 Logo，否则回退下载图标。 */
export function EnterpriseExportIcon({
  size = 14,
  className,
  alt = "企业 Logo",
}: {
  size?: number;
  className?: string;
  alt?: string;
}) {
  const logoUrl = useEnterpriseLogo();

  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt={alt}
        width={size}
        height={size}
        className={className}
        style={{
          width: size,
          height: size,
          borderRadius: 3,
          objectFit: "contain",
          flexShrink: 0,
        }}
      />
    );
  }

  return <Download size={size} className={className} aria-hidden />;
}
