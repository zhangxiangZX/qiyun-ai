"use client";

import { useMemo } from "react";

import { REGION_LEVEL_META } from "@/lib/geo/types";
import type { RegionPoint } from "@/lib/geo/types";

const MIN_LNG = 86;
const MAX_LNG = 135;
const MIN_LAT = 17;
const MAX_LAT = 54;
const W = 560;
const H = 440;
const PAD = 40;

function project(lng: number, lat: number): { x: number; y: number } {
  const x = PAD + ((lng - MIN_LNG) / (MAX_LNG - MIN_LNG)) * (W - PAD * 2);
  const y = PAD + ((MAX_LAT - lat) / (MAX_LAT - MIN_LAT)) * (H - PAD * 2);
  return { x, y };
}

export interface RegionScatterProps {
  regions: RegionPoint[];
  center?: { province: string; lng: number; lat: number };
}

export function RegionScatter({ regions, center }: RegionScatterProps) {
  const { points, centerPoint, spokes, maxCount } = useMemo(() => {
    const pts = regions.map((r) => ({ region: r, ...project(r.lng, r.lat) }));
    const max = Math.max(1, ...regions.map((r) => r.count));
    const hub =
      center ?? regions.reduce((a, b) => (b.count > a.count ? b : a), regions[0]);
    const hubPoint = hub ? project(hub.lng, hub.lat) : null;
    const spokeLines = hubPoint
      ? pts.map((p) => ({ x1: hubPoint.x, y1: hubPoint.y, x2: p.x, y2: p.y, level: p.region.level }))
      : [];
    return { points: pts, centerPoint: hubPoint, spokes: spokeLines, maxCount: max };
  }, [regions, center]);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-auto w-full"
      role="img"
      aria-label="客户地域分布散点图"
    >
      <defs>
        <pattern id="geo-grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="var(--border)" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect x="0" y="0" width={W} height={H} rx="14" fill="var(--muted)" opacity="0.35" />
      <rect x="0" y="0" width={W} height={H} rx="14" fill="url(#geo-grid)" />

      {spokes.map((s, i) => (
        <line
          key={`spoke-${i}`}
          x1={s.x1}
          y1={s.y1}
          x2={s.x2}
          y2={s.y2}
          stroke={REGION_LEVEL_META[s.level as keyof typeof REGION_LEVEL_META].color}
          strokeWidth="1"
          strokeOpacity="0.25"
          strokeDasharray="3 4"
        />
      ))}

      {points.map((p) => {
        const meta = REGION_LEVEL_META[p.region.level];
        const radius = 5 + (Math.sqrt(p.region.count) / Math.sqrt(maxCount)) * 18;
        const showLabel = p.region.level === "core" || p.region.level === "active";
        return (
          <g key={p.region.province}>
            <circle
              cx={p.x}
              cy={p.y}
              r={radius}
              fill={meta.color}
              fillOpacity="0.18"
              stroke={meta.color}
              strokeWidth="1.5"
            />
            {showLabel ? (
              <text
                x={p.x}
                y={p.y - radius - 4}
                textAnchor="middle"
                fontSize="11"
                fontWeight={600}
                fill="var(--foreground)"
              >
                {p.region.province}
              </text>
            ) : null}
            <text
              x={p.x}
              y={p.y + 3}
              textAnchor="middle"
              fontSize="9"
              fill={meta.color}
              fontWeight={700}
            >
              {p.region.count}
            </text>
          </g>
        );
      })}

      {centerPoint ? (
        <circle cx={centerPoint.x} cy={centerPoint.y} r="4" fill="#0f172a" />
      ) : null}
    </svg>
  );
}
