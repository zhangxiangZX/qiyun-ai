import Image from "next/image";

import { cn } from "@qiyun/ui";

import {
  BRAND_DOMAIN,
  BRAND_ICON_SRC,
  BRAND_LOGO_FULL_SRC,
  BRAND_NAME,
} from "@/lib/brand";

export interface BrandLogoProps {
  size?: "sm" | "md" | "lg";
  /** icon：仅云图标；wordmark：图标 + 中文名；lockup：完整横版 Logo 图 */
  layout?: "icon" | "wordmark" | "lockup";
  showSubtitle?: boolean;
  /** @deprecated 使用 layout="lockup" */
  showWordmark?: boolean;
  /** e.g. "Qiyun AI" on login page brand lockup */
  englishSubtitle?: string;
  /** `circle` matches floating-widget / sidebar mockup. */
  variant?: "default" | "circle";
  tone?: "default" | "on-dark";
  className?: string;
}

const sizeMap = {
  sm: { box: 32, image: 28, lockupW: 140, lockupH: 40 },
  md: { box: 40, image: 36, lockupW: 176, lockupH: 50 },
  lg: { box: 48, image: 44, lockupW: 220, lockupH: 62 },
} as const;

export function BrandLogo({
  size = "md",
  layout,
  showSubtitle = true,
  showWordmark = true,
  englishSubtitle,
  variant = "default",
  tone = "default",
  className,
}: BrandLogoProps) {
  const dims = sizeMap[size];
  const onDark = tone === "on-dark";
  const resolvedLayout = layout ?? (showWordmark ? "wordmark" : "icon");

  if (resolvedLayout === "lockup") {
    return (
      <div className={cn("flex min-w-0 items-center", className)}>
        <Image
          src={BRAND_LOGO_FULL_SRC}
          alt={BRAND_NAME}
          width={dims.lockupW}
          height={dims.lockupH}
          className="h-auto w-auto max-w-full object-contain"
          priority
        />
      </div>
    );
  }

  return (
    <div className={cn("flex min-w-0 items-center gap-3", className)}>
      <div
        className={cn(
          "relative flex shrink-0 items-center justify-center overflow-hidden",
          variant === "circle"
            ? "rounded-full bg-white shadow-[0_4px_16px_rgba(18,102,255,0.18)]"
            : "rounded-control",
        )}
        style={{ width: dims.box, height: dims.box }}
      >
        <Image
          src={BRAND_ICON_SRC}
          alt={BRAND_NAME}
          width={dims.image}
          height={dims.image}
          className="object-contain"
          style={{
            width: variant === "circle" ? dims.image - 6 : dims.image,
            height: variant === "circle" ? dims.image - 6 : dims.image,
          }}
        />
      </div>
      {resolvedLayout === "wordmark" ? (
        <div className="min-w-0">
          <p
            className={cn(
              "truncate text-base font-semibold leading-tight",
              onDark ? "text-white" : "text-[#0F172A]",
            )}
          >
            {BRAND_NAME}
          </p>
          {englishSubtitle ? (
            <p className={cn("truncate text-xs leading-tight", onDark ? "text-slate-400" : "text-[#64748B]")}>
              {englishSubtitle}
            </p>
          ) : showSubtitle ? (
            <p
              className={cn(
                "truncate text-xs leading-tight",
                onDark ? "text-slate-400" : "text-muted-foreground",
              )}
            >
              {BRAND_DOMAIN}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
