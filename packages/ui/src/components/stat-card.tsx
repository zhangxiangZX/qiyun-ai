import type { ReactNode } from "react";

import { cn } from "../lib/utils";

const iconToneClass = {
  brand: "bg-brand-500/10 text-brand-500",
  success: "bg-success/10 text-success",
  purple: "bg-violet-500/10 text-violet-600",
  warning: "bg-warning/10 text-warning",
  info: "bg-info/10 text-info",
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
  emphasis = "default",
  tone = "default",
}: StatCardProps) {
  const isMetric = emphasis === "metric";

  return (
    <section
      className={cn(
        isMetric
          ? "console-metric-card rounded-card border border-border bg-card p-4 shadow-card animate-fade-in-up"
          : "rounded-card border border-border bg-card p-5 shadow-card ui-hover-lift animate-fade-in-up",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          {icon ? (
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-control",
                iconToneClass[iconTone],
              )}
            >
              {icon}
            </div>
          ) : null}
          <div className="min-w-0">
            <p
              className={
                isMetric
                  ? "text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground"
                  : "text-sm font-medium text-muted-foreground"
              }
            >
              {label}
            </p>
            <p
              className={`mt-2 font-semibold tracking-tight ${
                isMetric ? "text-2xl" : "text-3xl"
              } ${tone === "warning" ? "text-warning" : "text-card-foreground"}`}
            >
              {value}
            </p>
          </div>
        </div>
        {trend ? <div className="shrink-0">{trend}</div> : null}
      </div>
      {description ? (
        <p className={`${isMetric ? "mt-1" : "mt-3"} text-sm leading-relaxed text-muted-foreground`}>
          {description}
        </p>
      ) : null}
    </section>
  );
}
