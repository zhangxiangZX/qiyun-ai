"use client";

import { useMemo, useState } from "react";

import { Button, Skeleton } from "@qiyun/ui";

import type { TrendPoint, TrendRange } from "@/lib/dashboard/types";

export interface DashboardTrendChartProps {
  trend7: TrendPoint[];
  trend30: TrendPoint[];
  loading?: boolean;
}

const CHART_WIDTH = 640;
const CHART_HEIGHT = 220;
const PADDING = { top: 16, right: 12, bottom: 28, left: 36 };

function buildPath(points: Array<{ x: number; y: number }>): string {
  if (!points.length) return "";
  return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
}

export function DashboardTrendChart({
  trend7,
  trend30,
  loading = false,
}: DashboardTrendChartProps) {
  const [range, setRange] = useState<TrendRange>(7);
  const data = range === 7 ? trend7 : trend30;

  const chart = useMemo(() => {
    if (!data.length) {
      return { sessionPath: "", leadPath: "", labels: [] as string[], gridLines: [] as number[] };
    }

    const maxValue = Math.max(...data.flatMap((point) => [point.sessions, point.leads]), 1);
    const innerWidth = CHART_WIDTH - PADDING.left - PADDING.right;
    const innerHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom;

    const toPoint = (value: number, index: number) => ({
      x: PADDING.left + (index / Math.max(data.length - 1, 1)) * innerWidth,
      y: PADDING.top + innerHeight - (value / maxValue) * innerHeight,
    });

    const sessionPoints = data.map((point, index) => toPoint(point.sessions, index));
    const leadPoints = data.map((point, index) => toPoint(point.leads, index));

    const labels = data.map((point, index) =>
      index % Math.ceil(data.length / 6) === 0 || index === data.length - 1 ? point.label : "",
    );

    const gridLines = [0, 0.5, 1].map(
      (ratio) => PADDING.top + innerHeight - ratio * innerHeight,
    );

    return {
      sessionPath: buildPath(sessionPoints),
      leadPath: buildPath(leadPoints),
      labels,
      gridLines,
    };
  }, [data]);

  if (loading) {
    return (
      <section className="rounded-card border border-border bg-card p-6 shadow-card">
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-9 w-28" />
        </div>
        <Skeleton className="mt-6 h-[220px] w-full" />
      </section>
    );
  }

  return (
    <section className="rounded-card border border-border bg-card p-6 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-card-foreground">会话与线索趋势</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            最近 {range} 天的会话量与留资线索变化。
          </p>
        </div>
        <div
          className="inline-flex rounded-control border border-border p-1"
          role="group"
          aria-label="选择趋势时间范围"
        >
          {([7, 30] as const).map((value) => (
            <Button
              key={value}
              type="button"
              size="sm"
              variant={range === value ? "default" : "ghost"}
              onClick={() => setRange(value)}
            >
              {value} 天
            </Button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-primary" aria-hidden />
          会话
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-info" aria-hidden />
          线索
        </span>
      </div>

      <div className="mt-4 overflow-x-auto">
        <svg
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          className="h-[220px] w-full min-w-[320px]"
          role="img"
          aria-label={`最近 ${range} 天会话与线索趋势图`}
        >
          {chart.gridLines.map((y) => (
            <line
              key={y}
              x1={PADDING.left}
              x2={CHART_WIDTH - PADDING.right}
              y1={y}
              y2={y}
              className="stroke-border"
              strokeWidth="1"
            />
          ))}
          <path d={chart.leadPath} fill="none" className="stroke-info" strokeWidth="2.5" />
          <path d={chart.sessionPath} fill="none" className="stroke-primary" strokeWidth="2.5" />
          {chart.labels.map((label, index) =>
            label ? (
              <text
                key={`${label}-${index}`}
                x={
                  PADDING.left +
                  (index / Math.max(data.length - 1, 1)) *
                    (CHART_WIDTH - PADDING.left - PADDING.right)
                }
                y={CHART_HEIGHT - 8}
                textAnchor="middle"
                className="fill-muted-foreground text-[10px]"
              >
                {label}
              </text>
            ) : null,
          )}
        </svg>
      </div>
    </section>
  );
}
