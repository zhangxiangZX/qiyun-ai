import Image from "next/image";

import { cn } from "@qiyun/ui";

export interface BrandLogoProps {
  size?: "sm" | "md" | "lg";
  showWordmark?: boolean;
  showSubtitle?: boolean;
  /** e.g. "Qiyun AI" on login page brand lockup */
  englishSubtitle?: string;
  /** `circle` matches floating-widget / sidebar mockup. */
  variant?: "default" | "circle";
  tone?: "default" | "on-dark";
  className?: string;
}

const sizeMap = {
  sm: { box: 32, image: 28 },
  md: { box: 40, image: 36 },
  lg: { box: 48, image: 44 },
} as const;

export function BrandLogo({
  size = "md",
  showWordmark = true,
  showSubtitle = true,
  englishSubtitle,
  variant = "default",
  tone = "default",
  className,
}: BrandLogoProps) {
  const dims = sizeMap[size];
  const onDark = tone === "on-dark";

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
          src="/brand/qiyun-logo.png"
          alt="企云 AI"
          width={dims.image}
          height={dims.image}
          className="object-contain"
          style={{
            width: variant === "circle" ? dims.image - 8 : dims.image,
            height: variant === "circle" ? dims.image - 8 : dims.image,
          }}
          priority
        />
      </div>
      {showWordmark ? (
        <div className="min-w-0">
          <p
            className={cn(
              "truncate text-base font-semibold leading-tight",
              onDark ? "text-sidebar-foreground" : "text-[#0F172A]",
            )}
          >
            企云 AI
          </p>
          {englishSubtitle ? (
            <p className="truncate text-xs leading-tight text-[#64748B]">{englishSubtitle}</p>
          ) : showSubtitle ? (
            <p
              className={cn(
                "truncate text-xs leading-tight",
                onDark ? "text-sidebar-muted" : "text-muted-foreground",
              )}
            >
              Enterprise Console
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
