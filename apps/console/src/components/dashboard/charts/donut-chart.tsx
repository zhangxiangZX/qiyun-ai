"use client";

import { useMemo } from "react";
import { cn } from "@qiyun/ui";

export interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

export interface DonutChartProps {
  segments: DonutSegment[];
  size?: number;
  innerRadius?: number;
  /** Show center label (e.g., total count) */
  centerLabel?: string;
  centerSublabel?: string;
  /** Show legend to the right (horizontal layout) */
  legendPosition?: "bottom" | "right" | "none";
  className?: string;
}

function buildSegments(
  segments: DonutSegment[],
  { size, innerRadius }: { size: number; innerRadius: number },
) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  if (total === 0) return [];

  let cumulative = 0;
  return segments
    .filter((s) => s.value > 0)
    .map((segment) => {
      const percentage = segment.value / total;
      const startAngle = cumulative * 2 * Math.PI;
      cumulative += percentage;
      const endAngle = cumulative * 2 * Math.PI;

      // Convert to SVG arc path
      const outerRadius = size / 2 - 4;
      const rOuter = outerRadius;
      const rInner = innerRadius;

      const x1 = size / 2 + rOuter * Math.cos(startAngle - Math.PI / 2);
      const y1 = size / 2 + rOuter * Math.sin(startAngle - Math.PI / 2);
      const x2 = size / 2 + rOuter * Math.cos(endAngle - Math.PI / 2);
      const y2 = size / 2 + rOuter * Math.sin(endAngle - Math.PI / 2);

      const x3 = size / 2 + rInner * Math.cos(endAngle - Math.PI / 2);
      const y3 = size / 2 + rInner * Math.sin(endAngle - Math.PI / 2);
      const x4 = size / 2 + rInner * Math.cos(startAngle - Math.PI / 2);
      const y4 = size / 2 + rInner * Math.sin(startAngle - Math.PI / 2);

      const largeArc = percentage > 0.5 ? 1 : 0;

      const pathData = [
        `M ${x1} ${y1}`,
        `A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${x2} ${y2}`,
        `L ${x3} ${y3}`,
        `A ${rInner} ${rInner} 0 ${largeArc} 0 ${x4} ${y4}`,
        "Z",
      ].join(" ");

      return { ...segment, percentage, pathData, total };
    });
}

export function DonutChart({
  segments,
  size = 160,
  innerRadius = size * 0.6,
  centerLabel,
  centerSublabel,
  legendPosition = "bottom",
  className,
}: DonutChartProps) {
  const arcs = useMemo(
    () => buildSegments(segments, { size, innerRadius }),
    [segments, size, innerRadius],
  );

  const total = useMemo(() => segments.reduce((s, seg) => s + seg.value, 0), [segments]);

  if (arcs.length === 0) {
    return (
      <div className={cn("flex items-center justify-center", className)} style={{ width: size, height: size }}>
        <p className="text-sm text-muted-foreground">暂无数据</p>
      </div>
    );
  }

  return (
    <div
      className={cn("flex items-center gap-4", className)}
      style={{
        flexDirection: legendPosition === "right" ? "row" : "column",
      }}
    >
      {/* SVG donut */}
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="shrink-0"
        role="img"
        aria-label="分布图"
      >
        {arcs.map((arc) => (
          <path key={arc.label} d={arc.pathData} fill={arc.color}>
            <title>
              {arc.label}: {arc.value} ({(arc.percentage * 100).toFixed(1)}%)
            </title>
          </path>
        ))}

        {/* Center text */}
        {(centerLabel || centerSublabel) && (
          <g>
            {centerLabel && (
              <text
                x={size / 2}
                y={size / 2 - (centerSublabel ? 4 : 1)}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-[20px] font-semibold fill-card-foreground"
              >
                {centerLabel}
              </text>
            )}
            {centerSublabel && (
              <text
                x={size / 2}
                y={size / 2 + 16}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-[11px] fill-muted-foreground"
              >
                {centerSublabel}
              </text>
            )}
          </g>
        )}
      </svg>

      {/* Legend */}
      {legendPosition !== "none" && (
        <div
          className={cn(
            "flex flex-wrap gap-x-4 gap-y-1.5",
            legendPosition === "bottom" ? "justify-center pt-2" : "flex-col",
          )}
        >
          {segments.map((seg) => {
            const pct = total > 0 ? ((seg.value / total) * 100).toFixed(1) : "0.0";
            return (
              <span key={seg.label} className="flex items-center gap-1.5 text-xs">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: seg.color }}
                  aria-hidden
                />
                <span className="text-muted-foreground">{seg.label}</span>
                <span className="font-medium text-card-foreground">{seg.value}</span>
                <span className="text-muted-foreground/70">({pct}%)</span>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
