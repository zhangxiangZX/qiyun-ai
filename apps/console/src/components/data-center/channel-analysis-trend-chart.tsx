"use client";

import { useId, useMemo, useState } from "react";

import styles from "@/styles/channel-analysis.module.css";

type TrendSeries = {
  label: string;
  totalInquiries: number;
  effectiveInquiries: number;
  newCustomers: number;
  wonCustomers: number;
};

const COLORS = {
  total: "#3b82f6",
  effective: "#22c55e",
  newCustomers: "#f59e0b",
  won: "#8b5cf6",
};

function buildPath(points: Array<{ x: number; y: number }>): string {
  if (!points.length) return "";
  return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
}

function buildArea(points: Array<{ x: number; y: number }>, baseline: number): string {
  if (!points.length) return "";
  const line = buildPath(points);
  const last = points[points.length - 1];
  const first = points[0];
  return `${line} L ${last.x} ${baseline} L ${first.x} ${baseline} Z`;
}

function niceMax(value: number): number {
  if (value <= 0) return 150;
  if (value <= 60) return 60;
  if (value <= 90) return 90;
  if (value <= 120) return 120;
  return 150;
}

export function ChannelAnalysisTrendChart({ data }: { data: TrendSeries[] }) {
  const [granularity, setGranularity] = useState<"day" | "week" | "month">("day");
  const blueGrad = useId().replace(/:/g, "");
  const greenGrad = useId().replace(/:/g, "");

  const chart = useMemo(() => {
    if (!data.length) return null;

    const width = 630;
    const height = 240;
    const maxValue = niceMax(
      Math.max(...data.flatMap((point) => [point.totalInquiries, point.effectiveInquiries])),
    );

    const toY = (value: number) => height - (value / maxValue) * height;

    const totalPoints = data.map((point, index) => ({
      x: (index / Math.max(data.length - 1, 1)) * width,
      y: toY(point.totalInquiries),
    }));
    const effectivePoints = data.map((point, index) => ({
      x: (index / Math.max(data.length - 1, 1)) * width,
      y: toY(point.effectiveInquiries),
    }));
    const newCustomerPoints = data.map((point, index) => ({
      x: (index / Math.max(data.length - 1, 1)) * width,
      y: toY(point.newCustomers),
    }));
    const wonPoints = data.map((point, index) => ({
      x: (index / Math.max(data.length - 1, 1)) * width,
      y: toY(point.wonCustomers),
    }));

    const yLabels = [0, 60, 90, 120, 150].filter((v) => v <= maxValue);
    if (!yLabels.includes(maxValue)) yLabels.push(maxValue);

    return {
      width,
      height,
      totalPoints,
      effectivePoints,
      newCustomerPoints,
      wonPoints,
      totalPath: buildPath(totalPoints),
      effectivePath: buildPath(effectivePoints),
      newCustomerPath: buildPath(newCustomerPoints),
      wonPath: buildPath(wonPoints),
      totalArea: buildArea(totalPoints, height),
      effectiveArea: buildArea(effectivePoints, height),
      yLabels: [...new Set([0, ...yLabels])].sort((a, b) => a - b),
      xLabels: data.map((point, index) => ({
        label: point.label,
        x: totalPoints[index]?.x ?? 0,
      })),
    };
  }, [data]);

  if (!chart) {
    return <p className={styles.emptyHint}>暂无趋势数据</p>;
  }

  return (
    <div>
      <div className={styles.chartHeader}>
        <h3 className={styles.chartTitle}>渠道询盘趋势</h3>
        <div className={styles.chartHeaderRight}>
          <div className={styles.legend}>
            <span className={styles.legendItem}>
              <i className={styles.legendDot} style={{ background: COLORS.total }} />
              总询盘量
            </span>
            <span className={styles.legendItem}>
              <i className={styles.legendDot} style={{ background: COLORS.effective }} />
              有效询盘量
            </span>
            <span className={styles.legendItem}>
              <i className={styles.legendDot} style={{ background: COLORS.newCustomers }} />
              新增客户数
            </span>
            <span className={styles.legendItem}>
              <i className={styles.legendDot} style={{ background: COLORS.won }} />
              交易客户数
            </span>
          </div>
          <div className={styles.timeTabs}>
            {(["day", "week", "month"] as const).map((key) => (
              <button
                key={key}
                type="button"
                className={granularity === key ? styles.timeTabActive : styles.timeTab}
                onClick={() => setGranularity(key)}
              >
                {key === "day" ? "日" : key === "week" ? "周" : "月"}
              </button>
            ))}
          </div>
        </div>
      </div>
      <svg className={styles.trendSvg} viewBox="0 0 700 300" aria-hidden>
        <defs>
          <linearGradient id={blueGrad} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={greenGrad} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22c55e" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
          </linearGradient>
        </defs>
        <text x="32" y="15" fontSize="11" fill="#94a3b8">
          单位：个
        </text>
        <g transform="translate(50, 30)">
          {[0, 60, 120, 180, 240].map((y) => (
            <line key={y} x1="0" y1={y} x2={chart.width} y2={y} stroke="#eef2f7" strokeWidth="1" />
          ))}
          {chart.yLabels.map((label) => {
            const y = chart.height - (label / niceMax(Math.max(...chart.yLabels))) * chart.height;
            return (
              <text key={label} x="-10" y={y + 4} fontSize="10" fill="#94a3b8" textAnchor="end">
                {label}
              </text>
            );
          })}
          <path d={chart.totalArea} fill={`url(#${blueGrad})`} />
          <path d={chart.effectiveArea} fill={`url(#${greenGrad})`} />
          <path d={chart.totalPath} fill="none" stroke={COLORS.total} strokeWidth="2.5" strokeLinecap="round" />
          <path d={chart.effectivePath} fill="none" stroke={COLORS.effective} strokeWidth="2.5" strokeLinecap="round" />
          <path d={chart.newCustomerPath} fill="none" stroke={COLORS.newCustomers} strokeWidth="2" strokeLinecap="round" />
          <path d={chart.wonPath} fill="none" stroke={COLORS.won} strokeWidth="2" strokeLinecap="round" />
          {chart.totalPoints.map((point, index) => (
            <circle key={`t-${index}`} cx={point.x} cy={point.y} r="3" fill={COLORS.total} />
          ))}
          {chart.effectivePoints.map((point, index) => (
            <circle key={`e-${index}`} cx={point.x} cy={point.y} r="3" fill={COLORS.effective} />
          ))}
          <g transform={`translate(0, ${chart.height + 15})`}>
            {chart.xLabels.map((item) => (
              <text key={item.label} x={item.x} y="12" fontSize="10" fill="#64748b" textAnchor="middle">
                {item.label}
              </text>
            ))}
          </g>
        </g>
      </svg>
    </div>
  );
}
