import type { ReactNode } from "react";

import { cn } from "../lib/utils";

/** 与询盘中心 KPI 色板对齐 */
const iconToneClass = {
  brand: "bg-[#3b82f6] text-white",
  success: "bg-[#22c55e] text-white",
  purple: "bg-[#8b5cf6] text-white",
  warning: "bg-[#f59e0b] text-white",
  info: "bg-[#06b6d4] text-white",
} as const;

export interface StatCardProps {
  label: string;
  value: string;
  description?: string;
  trend?: ReactNode;
  icon?: ReactNode;
  iconTone?: keyof typeof iconToneClass;
  /** `metric` uses compact uppercase label styling for summary grids. */
  emphasis?: "default" | "metric";
  tone?: "default" | "warning";
}

export function StatCard({
  label,
  value,
  description,
  trend,
  icon,
  iconTone = "brand",
  emphasis: _emphasis = "default",
  tone = "default",
}: StatCardProps) {
  return (
    <section
      className="rounded-card border border-border bg-card p-5 shadow-card ui-hover-lift animate-fade-in-up"
    >
      <div className="flex items-start gap-4">
        {icon ? (
          <div
            className={cn(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
              iconToneClass[iconTone],
            )}
          >
            {icon}
          </div>
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-muted-foreground">{label}</p>
              <p
                className={cn(
                  "mt-1 text-2xl font-bold tabular-nums tracking-tight leading-tight",
                  tone === "warning" ? "text-warning" : "text-card-foreground",
                )}
              >
                {value}
              </p>
            </div>
            {trend ? <div className="shrink-0">{trend}</div> : null}
          </div>
          {description ? (
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{description}</p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
