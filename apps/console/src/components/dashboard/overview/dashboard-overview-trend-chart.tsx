"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

import type { TrendPoint } from "@/lib/dashboard/types";

import styles from "@/styles/dashboard-overview.module.css";

const CHART_WIDTH = 550;
const CHART_HEIGHT = 240;
const PADDING = { top: 35, right: 20, bottom: 55, left: 45 };

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

export interface DashboardOverviewTrendChartProps {
  data: TrendPoint[];
  /** Changes when switching 7d/30d to replay draw animation. */
  revision?: string | number;
}

export function DashboardOverviewTrendChart({ data, revision = "default" }: DashboardOverviewTrendChartProps) {
  const sessionPathRef = useRef<SVGPathElement>(null);
  const leadPathRef = useRef<SVGPathElement>(null);
  const [pathsReady, setPathsReady] = useState(false);
  const shadowId = useId().replace(/:/g, "");

  const chart = useMemo(() => {
    if (!data.length) return null;

    const maxValue = Math.max(...data.flatMap((point) => [point.sessions, point.leads]), 1);
    const innerWidth = CHART_WIDTH - PADDING.left - PADDING.right;
    const innerHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom;

    const toPoint = (value: number, index: number) => ({
      x: PADDING.left + (index / Math.max(data.length - 1, 1)) * innerWidth,
      y: PADDING.top + innerHeight - (value / maxValue) * innerHeight,
    });

    const sessionPoints = data.map((point, index) => toPoint(point.sessions, index));
    const leadPoints = data.map((point, index) => toPoint(point.leads, index));
    const gridYs = [0.25, 0.5, 0.75, 1].map(
      (ratio) => PADDING.top + innerHeight - ratio * innerHeight,
    );
    const yLabels = [0, maxValue * 0.33, maxValue * 0.66, maxValue].map((value) =>
      Math.round(value),
    );

    const tooltipIndex = Math.min(4, data.length - 1);
    const tooltipPoint = data[tooltipIndex];

    return {
      sessionPath: buildSmoothPath(sessionPoints),
      leadPath: buildSmoothPath(leadPoints),
      gridYs,
      yLabels,
      xLabels: data.map((point, index) => ({
        label: point.label.replace("/", "-"),
        x: sessionPoints[index]?.x ?? PADDING.left,
      })),
      tooltip: {
        x: sessionPoints[tooltipIndex]?.x ?? PADDING.left,
        y: Math.min(sessionPoints[tooltipIndex]?.y ?? 80, leadPoints[tooltipIndex]?.y ?? 120) - 20,
        label: tooltipPoint.label.replace("/", "-"),
        sessions: tooltipPoint.sessions.toLocaleString("zh-CN"),
        leads: tooltipPoint.leads.toLocaleString("zh-CN"),
      },
      lastSession: sessionPoints[sessionPoints.length - 1],
      lastLead: leadPoints[leadPoints.length - 1],
    };
  }, [data]);

  useEffect(() => {
    setPathsReady(false);
    const sessionEl = sessionPathRef.current;
    const leadEl = leadPathRef.current;
    if (!sessionEl || !leadEl || !chart) return;

    const sessionLength = sessionEl.getTotalLength();
    const leadLength = leadEl.getTotalLength();

    sessionEl.style.strokeDasharray = `${sessionLength}`;
    sessionEl.style.strokeDashoffset = `${sessionLength}`;
    leadEl.style.strokeDasharray = `${leadLength}`;
    leadEl.style.strokeDashoffset = `${leadLength}`;

    const frame = requestAnimationFrame(() => {
      sessionEl.style.transition = "stroke-dashoffset 0.85s cubic-bezier(0.22, 1, 0.36, 1)";
      leadEl.style.transition = "stroke-dashoffset 1s cubic-bezier(0.22, 1, 0.36, 1) 0.12s";
      sessionEl.style.strokeDashoffset = "0";
      leadEl.style.strokeDashoffset = "0";
      setPathsReady(true);
    });

    return () => cancelAnimationFrame(frame);
  }, [chart, revision]);

  if (!chart) {
    return (
      <svg className={styles.chart} viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} aria-hidden>
        <text x="45" y="120" fill="#8090ab" fontSize="12">
          暂无趋势数据
        </text>
      </svg>
    );
  }

  return (
    <svg
      className={`${styles.chart} ${pathsReady ? styles.chartReady : ""}`}
      viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
      fill="none"
      aria-label="会话趋势图"
      key={String(revision)}
    >
      {chart.gridYs.map((y, index) => (
        <line
          key={y}
          className={styles.chartGridLine}
          style={{ animationDelay: `${index * 40}ms` }}
          x1="45"
          x2="530"
          y1={y}
          y2={y}
          stroke="#EDF1F7"
        />
      ))}
      {chart.yLabels.map((label, index) => (
        <text
          key={label}
          className={styles.chartAxisLabel}
          style={{ animationDelay: `${index * 50}ms` }}
          x="4"
          y={chart.gridYs[index] + 4}
        >
          {label}
        </text>
      ))}
      <path
        ref={sessionPathRef}
        d={chart.sessionPath}
        className={styles.chartLineSession}
        stroke="#3D5AFE"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        ref={leadPathRef}
        d={chart.leadPath}
        className={styles.chartLineLead}
        stroke="#4BCB8C"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {chart.xLabels.map((item, index) => (
        <text
          key={item.label}
          className={styles.chartAxisLabel}
          style={{ animationDelay: `${120 + index * 35}ms` }}
          x={item.x}
          y="220"
          textAnchor="middle"
        >
          {item.label}
        </text>
      ))}
      {chart.lastSession ? (
        <circle
          className={styles.chartDotSession}
          cx={chart.lastSession.x}
          cy={chart.lastSession.y}
          r="4.5"
          fill="#3D5AFE"
        />
      ) : null}
      {chart.lastLead ? (
        <circle
          className={styles.chartDotLead}
          cx={chart.lastLead.x}
          cy={chart.lastLead.y}
          r="4.5"
          fill="#4BCB8C"
        />
      ) : null}
      <g
        className={styles.chartTooltip}
        transform={`translate(${chart.tooltip.x - 58} ${chart.tooltip.y})`}
      >
        <rect width="116" height="74" rx="8" fill="white" filter={`url(#${shadowId})`} />
        <text x="13" y="22" fill="#75839D">
          {chart.tooltip.label}
        </text>
        <circle cx="16" cy="42" r="4" fill="#3D5AFE" />
        <text x="28" y="46" fill="#50627F">
          会话数
        </text>
        <text x="94" y="46" fill="#1D2B4B" fontWeight="700">
          {chart.tooltip.sessions}
        </text>
        <circle cx="16" cy="61" r="4" fill="#4BCB8C" />
        <text x="28" y="65" fill="#50627F">
          线索数
        </text>
        <text x="94" y="65" fill="#1D2B4B" fontWeight="700">
          {chart.tooltip.leads}
        </text>
      </g>
      <defs>
        <filter id={shadowId} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#244070" floodOpacity=".14" />
        </filter>
      </defs>
    </svg>
  );
}
