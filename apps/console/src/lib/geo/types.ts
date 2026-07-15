export type RegionLevel = "core" | "active" | "emerging" | "untapped";

export interface RegionPoint {
  province: string;
  /** Longitude (East). */
  lng: number;
  /** Latitude (North). */
  lat: number;
  /** Number of leads / customers in this region. */
  count: number;
  level: RegionLevel;
}

export interface RegionDistributionResult {
  regions: RegionPoint[];
  /** Hub province used for the spoke visualization. */
  center?: { province: string; lng: number; lat: number };
}

export interface RegionLevelMeta {
  label: string;
  color: string;
}

export const REGION_LEVEL_META: Record<RegionLevel, RegionLevelMeta> = {
  core: { label: "核心区", color: "#3b5eff" },
  active: { label: "活跃区", color: "#0ea5e9" },
  emerging: { label: "培育区", color: "#f97316" },
  untapped: { label: "待开拓", color: "#94a3b8" },
};
