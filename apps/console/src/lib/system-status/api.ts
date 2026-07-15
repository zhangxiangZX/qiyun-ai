import { apiRequest } from "@/lib/api/client";
import type { SystemStatusSnapshot } from "@/lib/system-status/types";

export async function fetchSystemStatus(): Promise<SystemStatusSnapshot> {
  return apiRequest<SystemStatusSnapshot>("/console/system-status");
}
