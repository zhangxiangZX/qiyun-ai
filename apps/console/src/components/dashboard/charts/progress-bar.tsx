"use client";

import { cn } from "@qiyun/ui";

export interface ProgressBarProps {
  value: number; // 0-100
  max?: number;
  label?: string;
  status?: "done" | "in-progress" | "pending" | "error";
  statusLabel?: string;
  showPercentage?: boolean;
  /** Tailwind color for the filled portion */
  colorClass?: string;
  className?: string;
}

const STATUS_STYLES = {
  done: { bar: "bg-emerald-500", text: "text-emerald-600" },
  "in-progress": { bar: "bg-blue-500", text: "text-blue-600" },
  pending: { bar: "bg-amber-500", text: "text-amber-600" },
  error: { bar: "bg-red-500", text: "text-red-600" },
};

export function ProgressBar({
  value,
  max = 100,
  label,
  status = "in-progress",
  statusLabel,
  showPercentage = true,
  colorClass,
  className,
}: ProgressBarProps) {
  const pct = Math.min(Math.max((value / max) * 100, 0), 100);
  const styles = STATUS_STYLES[status];
  const barColor = colorClass ?? styles.bar;

  return (
    <div className={cn("space-y-1.5", className)}>
      {(label || showPercentage) && (
        <div className="flex items-center justify-between">
          {label ? (
            <span className="flex items-center gap-2 text-sm font-medium text-card-foreground">
              {/* Status dot */}
              <span
                className={cn(
                  "inline-block h-2 w-2 rounded-full",
                  status === "done"
                    ? "bg-emerald-500"
                    : status === "pending"
                      ? "bg-amber-500"
                      : status === "error"
                        ? "bg-red-500"
                        : "bg-blue-500",
                )}
                aria-hidden
              />
              {label}
            </span>
          ) : (
            <span />
          )}
          {showPercentage && (
            <span className={cn("text-xs font-medium", styles.text)}>
              {statusLabel ?? `${Math.round(pct)}%`}
            </span>
          )}
        </div>
      )}

      {/* Track */}
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted/60">
        <div
          className={cn("h-full rounded-full transition-all duration-500 ease-out", barColor)}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={Math.round(pct)}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
}
