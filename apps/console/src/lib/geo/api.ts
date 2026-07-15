import { apiRequest } from "@/lib/api/client";
import { listRegionsMock } from "./mock-data";
import type { RegionDistributionResult } from "./types";

export async function listRegionsFromApi(): Promise<RegionDistributionResult> {
  try {
    const data = await apiRequest<RegionDistributionResult>("/geo/distribution");
    return {
      regions: data?.regions ?? [],
      center: data?.center,
    };
  } catch (error) {
    // V2 后端未就绪：apps/api GET /geo/distribution 由 Codex 实现（Task #10）。
    console.warn(
      "[geo] upstream GET /geo/distribution unavailable, falling back to preview data. " +
        "Check API_BASE_URL and the upstream geo service.",
      error,
    );
    return { regions: listRegionsMock() };
  }
}
