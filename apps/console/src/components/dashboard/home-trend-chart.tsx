"use client";

import { useId, useMemo, useState } from "react";

import type { TrendPoint } from "@/lib/dashboard/types";
import styles from "@/styles/home-overview.module.css";

const CHART_WIDTH = 620;
const CHART_HEIGHT = 260;
const PADDING = { top: 28, right: 16, bottom: 48, left: 48 };

function buildSmoothPath(points: Array<{ x: number; y: number }>): string {
  if (!points.length) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let path = `M ${points[0].x} ${points[0].y}`;
  for (let index = 1; index < points.length; index += 1) {
    const prev = points[index - 1];
    const current = points[index];
    const midX = (prev.x + current.x) / 2;
    path += ` C ${midX} ${prev.y} ${midX} ${current.y} ${current.x} ${current.y}`;
  }
  return path;
}

function buildAreaPath(points: Array<{ x: number; y: number }>, baselineY: number): string {
  if (!points.length) return "";
  const line = buildSmoothPath(points);
  const last = points[points.length - 1];
  const first = points[0];
  return `${line} L ${last.x} ${baselineY} L ${first.x} ${baselineY} Z`;
}

function niceChartMax(value: number): number {
  if (value <= 0) return 1500;
  const rough = Math.ceil(value * 1.15);
  if (rough <= 100) return 100;
  if (rough <= 300) return 300;
  if (rough <= 600) return 600;
  if (rough <= 900) return 900;
  if (rough <= 1200) return 1200;
  if (rough <= 1500) return 1500;
  return Math.ceil(rough / 300) * 300;
}

export function HomeTrendChart({
  data,
  revision = "default",
}: {
  data: TrendPoint[];
  revision?: string | number;
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const blueGradientId = useId().replace(/:/g, "");
  const greenGradientId = useId().replace(/:/g, "");
  const shadowId = useId().replace(/:/g, "");

  const chart = useMemo(() => {
    if (!data.length) return null;

    const maxValue = niceChartMax(Math.max(...data.flatMap((point) => [point.sessions, point.leads])));
    const innerWidth = CHART_WIDTH - PADDING.left - PADDING.right;
    const innerHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom;
    const baselineY = PADDING.top + innerHeight;

    const toPoint = (value: number, index: number) => ({
      x: PADDING.left + (index / Math.max(data.length - 1, 1)) * innerWidth,
      y: PADDING.top + innerHeight - (value / maxValue) * innerHeight,
    });

    const inquiryPoints = data.map((point, index) => toPoint(point.sessions, index));
    const intentPoints = data.map((point, index) => toPoint(point.leads, index));
    const yTicks = [0, 0.2, 0.4, 0.6, 0.8, 1].map((ratio) => ({
      y: PADDING.top + innerHeight - ratio * innerHeight,
      label: Math.round(maxValue * ratio).toLocaleString("zh-CN"),
    }));

    const activeIndex = hoverIndex ?? Math.min(4, data.length - 1);
    const activePoint = data[activeIndex];

    return {
      inquiryPath: buildSmoothPath(inquiryPoints),
      intentPath: buildSmoothPath(intentPoints),
      inquiryArea: buildAreaPath(inquiryPoints, baselineY),
      intentArea: buildAreaPath(intentPoints, baselineY),
      yTicks,
      xLabels: data.map((point, index) => ({
        label: point.label.replace("/", "-"),
        x: inquiryPoints[index]?.x ?? PADDING.left,
      })),
      inquiryPoints,
      intentPoints,
      tooltip: {
        x: inquiryPoints[activeIndex]?.x ?? PADDING.left,
        y: Math.min(inquiryPoints[activeIndex]?.y ?? 80, intentPoints[activeIndex]?.y ?? 120) - 18,
        label: activePoint.label.replace("/", "-"),
        inquiries: activePoint.sessions.toLocaleString("zh-CN"),
        highIntent: activePoint.leads.toLocaleString("zh-CN"),
      },
      hitZones: data.map((_, index) => ({
        x: inquiryPoints[index].x - innerWidth / data.length / 2,
        width: innerWidth / data.length,
        index,
      })),
    };
  }, [data, hoverIndex]);

  if (!chart) {
    return (
      <svg className={styles.homeTrendChart} viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} aria-hidden>
        <text x="48" y="130" fill="#8090ab" fontSize="12">
          暂无趋势数据
        </text>
      </svg>
    );
  }

  return (
    <svg
      className={styles.homeTrendChart}
      viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
      fill="none"
      aria-label="询盘趋势图"
      key={String(revision)}
      onMouseLeave={() => setHoverIndex(null)}
    >
      <defs>
        <linearGradient id={blueGradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3f5eff" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#3f5eff" stopOpacity="0.02" />
        </linearGradient>
        <linearGradient id={greenGradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4bcf8a" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#4bcf8a" stopOpacity="0.02" />
        </linearGradient>
        <filter id={shadowId} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#244070" floodOpacity=".12" />
        </filter>
      </defs>

      {chart.yTicks.map((tick) => (
        <g key={tick.y}>
          <line x1={PADDING.left} x2={CHART_WIDTH - PADDING.right} y1={tick.y} y2={tick.y} stroke="#edf1f7" />
          <text x="8" y={tick.y + 4}>
            {tick.label}
          </text>
        </g>
      ))}

      <path d={chart.inquiryArea} fill={`url(#${blueGradientId})`} />
      <path d={chart.intentArea} fill={`url(#${greenGradientId})`} />
      <path d={chart.inquiryPath} stroke="#3f5eff" strokeWidth="2.5" strokeLinecap="round" />
      <path d={chart.intentPath} stroke="#4bcf8a" strokeWidth="2.5" strokeLinecap="round" />

      {chart.inquiryPoints.map((point, index) => (
        <circle
          key={`inq-${index}`}
          cx={point.x}
          cy={point.y}
          r={hoverIndex === index ? 5 : 4}
          fill="#3f5eff"
          stroke="#fff"
          strokeWidth="1.5"
        />
      ))}
      {chart.intentPoints.map((point, index) => (
        <circle
          key={`int-${index}`}
          cx={point.x}
          cy={point.y}
          r={hoverIndex === index ? 5 : 4}
          fill="#4bcf8a"
          stroke="#fff"
          strokeWidth="1.5"
        />
      ))}

      {chart.xLabels.map((item) => (
        <text key={item.label} x={item.x} y={CHART_HEIGHT - 16} textAnchor="middle">
          {item.label}
        </text>
      ))}

      {chart.hitZones.map((zone) => (
        <rect
          key={zone.index}
          x={zone.x}
          y={PADDING.top}
          width={zone.width}
          height={CHART_HEIGHT - PADDING.top - PADDING.bottom}
          fill="transparent"
          onMouseEnter={() => setHoverIndex(zone.index)}
        />
      ))}

      <g transform={`translate(${Math.min(Math.max(chart.tooltip.x - 62, 8), CHART_WIDTH - 132)} ${Math.max(chart.tooltip.y, 12)})`}>
        <rect width="124" height="76" rx="8" fill="#fff" filter={`url(#${shadowId})`} />
        <text x="14" y="22" fill="#75839d" fontSize="11">
          {chart.tooltip.label}
        </text>
        <circle cx="18" cy="40" r="4" fill="#3f5eff" />
        <text x="30" y="44" fill="#50627f" fontSize="11">
          询盘数
        </text>
        <text x="110" y="44" fill="#1d2b4b" fontSize="11" fontWeight="700" textAnchor="end">
          {chart.tooltip.inquiries}
        </text>
        <circle cx="18" cy="60" r="4" fill="#4bcf8a" />
        <text x="30" y="64" fill="#50627f" fontSize="11">
          高意向数
        </text>
        <text x="110" y="64" fill="#1d2b4b" fontSize="11" fontWeight="700" textAnchor="end">
          {chart.tooltip.highIntent}
        </text>
      </g>
    </svg>
  );
}
