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
  /** 在数据点上方显示数值（对齐老板首页趋势图样式） */
  showValueLabels?: boolean;
  className?: string;
  /** Show y-axis values on the left */
  showYAxis?: boolean;
}

type PlotBox = {
  width: number;
  height: number;
  paddingX: number;
  paddingTop: number;
  paddingBottom: number;
};

function buildPath(data: number[], box: PlotBox, min: number, range: number) {
  if (!data.length) return "";
  const { width, height, paddingX, paddingTop, paddingBottom } = box;
  const plotHeight = height - paddingTop - paddingBottom;
  const stepX = (width - paddingX * 2) / Math.max(data.length - 1, 1);

  return data
    .map((value, i) => {
      if (value == null) return "";
      const x = paddingX + i * stepX;
      const y = height - paddingBottom - ((value - min) / range) * plotHeight;
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
}

/** 日期过多时抽稀 X 轴标签，始终保留首尾 */
function visibleLabelIndexes(total: number, maxLabels = 8): Set<number> {
  if (total <= maxLabels) {
    return new Set(Array.from({ length: total }, (_, i) => i));
  }
  const indexes = new Set<number>([0, total - 1]);
  const inner = maxLabels - 2;
  for (let i = 1; i <= inner; i += 1) {
    indexes.add(Math.round((i * (total - 1)) / (inner + 1)));
  }
  return indexes;
}

/** 生成整齐的 Y 轴刻度（含顶部留白，避免数值标签贴顶） */
function niceYTicks(maxValue: number, tickCount = 5): number[] {
  const padded = Math.max(maxValue * 1.15, 1);
  const rough = padded / tickCount;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const niceStep =
    ([1, 2, 2.5, 5, 10].map((n) => n * magnitude).find((n) => n >= rough) ?? magnitude * 10);
  const top = Math.ceil(padded / niceStep) * niceStep;
  const ticks: number[] = [];
  for (let value = 0; value <= top + 1e-9; value += niceStep) {
    ticks.push(Number(value.toFixed(6)));
  }
  return ticks;
}

function pointPosition(
  index: number,
  value: number,
  total: number,
  box: PlotBox,
  min: number,
  range: number,
) {
  const stepX = (box.width - box.paddingX * 2) / Math.max(total - 1, 1);
  const plotHeight = box.height - box.paddingTop - box.paddingBottom;
  return {
    x: box.paddingX + index * stepX,
    y: box.height - box.paddingBottom - ((value - min) / range) * plotHeight,
  };
}

export function MiniLineChart({
  series,
  width = 320,
  height = 180,
  labels,
  showGrid = true,
  showDots = true,
  showValueLabels = false,
  className,
  showYAxis = false,
}: MiniLineChartProps) {
  const paddingX = showYAxis ? 36 : 20;
  const paddingTop = showValueLabels ? 28 : 14;
  // 底部留白加大，避免 0 值圆点压住日期
  const paddingBottom = labels?.length ? 36 : 16;
  const box: PlotBox = { width, height, paddingX, paddingTop, paddingBottom };

  const allValues = useMemo(
    () => series.flatMap((s) => s.data).filter((v): v is number => v != null),
    [series],
  );

  const dataMax = useMemo(() => Math.max(...allValues, 0), [allValues]);
  const yTicks = useMemo(
    () => (showYAxis ? niceYTicks(dataMax) : [0, dataMax || 1]),
    [showYAxis, dataMax],
  );
  const minVal = 0;
  const maxVal = yTicks[yTicks.length - 1] ?? Math.max(dataMax, 1);
  const range = maxVal - minVal || 1;

  const labelIndexes = useMemo(
    () => visibleLabelIndexes(labels?.length ?? 0, labels && labels.length > 14 ? 7 : 8),
    [labels],
  );

  /** 0 不标字；长区间再抽稀 */
  const shouldShowValue = (index: number, value: number, len: number) => {
    if (!showValueLabels || value <= 0) return false;
    if (len <= 10) return true;
    return visibleLabelIndexes(len, 8).has(index);
  };

  return (
    <div className={cn("w-full overflow-hidden", className)}>
      <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-1">
        {series.map((s) => (
          <span key={s.label} className="inline-flex items-center gap-2 text-[12px] text-[#5b6b86]">
            <svg width="28" height="10" aria-hidden className="shrink-0">
              <line x1="0" y1="5" x2="28" y2="5" stroke={s.color} strokeWidth="1.5" />
              <circle cx="14" cy="5" r="3" fill="#fff" stroke={s.color} strokeWidth="1.5" />
            </svg>
            {s.label}
          </span>
        ))}
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="趋势折线图"
      >
        {showGrid
          ? yTicks
              .filter((tick) => tick > 0)
              .map((tick) => {
                const y =
                  height -
                  paddingBottom -
                  ((tick - minVal) / range) * (height - paddingTop - paddingBottom);
                return (
                  <line
                    key={`grid-${tick}`}
                    x1={paddingX}
                    y1={y}
                    x2={width - 12}
                    y2={y}
                    stroke="#d8dee8"
                    strokeWidth={1}
                    strokeDasharray="4 4"
                  />
                );
              })
          : null}

        {showYAxis
          ? yTicks
              .filter((tick) => tick > 0)
              .map((tick) => {
                const y =
                  height -
                  paddingBottom -
                  ((tick - minVal) / range) * (height - paddingTop - paddingBottom);
                return (
                  <text
                    key={`ytick-${tick}`}
                    x={paddingX - 8}
                    y={y + 3}
                    textAnchor="end"
                    fontSize={12}
                    fill="#8a97ad"
                  >
                    {tick}
                  </text>
                );
              })
          : null}

        {labels?.map((label, i) => {
          if (!labelIndexes.has(i)) return null;
          const stepX = (width - paddingX * 2) / Math.max(labels.length - 1, 1);
          const x = paddingX + i * stepX;
          return (
            <text
              key={`xlabel-${i}`}
              x={x}
              y={height - 8}
              textAnchor="middle"
              fontSize={12}
              fill="#8a97ad"
            >
              {label}
            </text>
          );
        })}

        {series.map((s, seriesIndex) => (
          <g key={s.label}>
            <path
              d={buildPath(s.data, box, minVal, range)}
              fill="none"
              stroke={s.color}
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={s.dashArray ?? "none"}
            />
            {s.data.map((value, i) => {
              if (value == null) return null;
              const peer = series[seriesIndex === 0 ? 1 : 0]?.data[i];
              const samePoint = peer != null && peer === value;
              // 两线同值时错开圆点，避免完全重叠
              const { x: baseX, y } = pointPosition(i, value, s.data.length, box, minVal, range);
              const x = samePoint ? baseX + (seriesIndex === 0 ? -3 : 3) : baseX;
              const crowded = peer != null && Math.abs(peer - value) / range < 0.08 && peer !== value;
              const labelY = y - 10 - (crowded && seriesIndex === 1 ? 12 : 0);
              return (
                <g key={`point-${s.label}-${i}`}>
                  {shouldShowValue(i, value, s.data.length) ? (
                    <text
                      x={x}
                      y={labelY}
                      textAnchor="middle"
                      fontSize={12}
                      fontWeight={600}
                      fill={s.color}
                    >
                      {value}
                    </text>
                  ) : null}
                  {showDots ? (
                    <circle
                      cx={x}
                      cy={y}
                      r={3.5}
                      fill="#fff"
                      stroke={s.color}
                      strokeWidth={1.5}
                    />
                  ) : null}
                </g>
              );
            })}
          </g>
        ))}
      </svg>
    </div>
  );
}
