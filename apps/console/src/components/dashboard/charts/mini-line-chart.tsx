"use client";

import { useMemo } from "react";
import { cn } from "@qiyun/ui";

export interface LineSeries {
  label: string;
  data: number[];
  color: string;
  /** Dash array for the line (e.g., "4 4" for dashed) */
  dashArray?: string;
}

export interface MiniLineChartProps {
  series: LineSeries[];
  width?: number;
  height?: number;
  labels?: string[];
  showGrid?: boolean;
  showDots?: boolean;
  className?: string;
  /** Show y-axis values on the left */
  showYAxis?: boolean;
}

function buildPath(
  data: number[],
  { width, height, padding }: { width: number; height: number; padding: number },
) {
  if (!data.length || data.every((v) => v === undefined)) return "";
  const max = Math.max(...data.filter((v): v is number => v != null), 1);
  const min = Math.min(...data.filter((v): v is number => v != null), 0);
  const range = max - min || 1;
  const stepX = (width - padding * 2) / Math.max(data.length - 1, 1);

  return data
    .map((value, i) => {
      if (value == null) return "";
      const x = padding + i * stepX;
      const y = height - padding - ((value - min) / range) * (height - padding * 2);
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
}

export function MiniLineChart({
  series,
  width = 320,
  height = 180,
  labels,
  showGrid = true,
  showDots = true,
  className,
  showYAxis = false,
}: MiniLineChartProps) {
  const padding = labels && showYAxis ? 28 : 20;

  const allValues = useMemo(
    () => series.flatMap((s) => s.data).filter((v): v is number => v != null),
    [series],
  );

  const maxVal = useMemo(() => Math.max(...allValues, 1), [allValues]);
  const minVal = useMemo(() => Math.min(...allValues, 0), [allValues]);
  const range = maxVal - minVal || 1;

  // Y-axis tick positions
  const yTicks = showYAxis
    ? [maxVal, Math.round((maxVal + minVal) / 2), minVal]
    : [];

  // Grid lines
  const gridLines = showYAxis
    ? yTicks.map((v) => {
        const y =
          height -
          padding -
          ((v - minVal) / range) * (height - padding * 2);
        return (
          <line
            key={`grid-${v}`}
            x1={padding}
            y1={y}
            x2={width - padding}
            y2={y}
            stroke="currentColor"
            strokeWidth={0.5}
            className="text-muted-foreground/30"
          />
        );
      })
    : [];

  return (
    <div className={cn("w-full overflow-hidden rounded-xl", className)}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="趋势折线图"
      >
        {/* Grid */}
        {showGrid && <g>{gridLines}</g>}

        {/* X-axis labels */}
        {labels?.map((label, i) => {
          const stepX = (width - padding * 2) / Math.max(labels.length - 1, 1);
          const x = padding + i * stepX;
          return (
            <text
              key={`label-${i}`}
              x={x}
              y={height - 6}
              textAnchor="middle"
              className="fill-[10px] fill-muted-foreground"
            >
              {label}
            </text>
          );
        })}

        {/* Y-axis labels */}
        {yTicks.map((tick, i) => {
          const y =
            height -
            padding -
            ((tick - minVal) / range) * (height - padding * 2);
          return (
            <text
              key={`ytick-${i}`}
              x={4}
              y={y + 3}
              textAnchor="start"
              className="fill-[9px] fill-muted-foreground/60"
            >
              {tick}
            </text>
          );
        })}

        {/* Lines */}
        {series.map((s) => (
          <g key={s.label}>
            <path
              d={buildPath(s.data, { width, height, padding })}
              fill="none"
              stroke={s.color}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={s.dashArray ?? "none"}
            />
            {/* Dots */}
            {showDots &&
              s.data.map((value, i) => {
                if (value == null) return null;
                const stepX = (width - padding * 2) / Math.max(s.data.length - 1, 1);
                const x = padding + i * stepX;
                const y =
                  height -
                  padding -
                  ((value - minVal) / range) * (height - padding * 2);
                return (
                  <circle key={`dot-${s.label}-${i}`} cx={x} cy={y} r={3} fill={s.color} />
                );
              })}
          </g>
        ))}
      </svg>

      {/* Legend below chart */}
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {series.map((s) => (
          <span key={s.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="inline-block h-2 w-5 rounded-sm" style={{ backgroundColor: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}
