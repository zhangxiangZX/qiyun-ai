import { fetchConsoleMode, isPreviewMode } from "@/lib/api/mode";
import { listRegionsMock } from "./mock-data";
import { listRegionsFromApi } from "./api";
import type { RegionDistributionResult, RegionPoint } from "./types";

export async function listRegions(): Promise<RegionDistributionResult> {
  const mode = await fetchConsoleMode();
  if (isPreviewMode(mode)) {
    return { regions: listRegionsMock() };
  }
  return listRegionsFromApi();
}

export function summarizeRegions(regions: RegionPoint[]) {
  const total = regions.reduce((sum, r) => sum + r.count, 0);
  const provinces = regions.length;
  const core = regions
    .filter((r) => r.level === "core")
    .reduce((sum, r) => sum + r.count, 0);
  const untapped = regions.filter((r) => r.level === "untapped").length;
  const coreShare = total === 0 ? 0 : Math.round((core / total) * 100);
  return { total, provinces, coreShare, untapped };
}
