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
