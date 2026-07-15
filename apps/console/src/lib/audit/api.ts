import { apiRequest } from "@/lib/api/client";
import type { AuditEntry } from "@/lib/audit/types";

export async function listAuditLogs(query?: {
  module?: string;
  targetId?: string;
  limit?: number;
  offset?: number;
}): Promise<AuditEntry[]> {
  const params = new URLSearchParams();
  if (query?.module) params.set("module", query.module);
  if (query?.targetId) params.set("targetId", query.targetId);
  if (query?.limit) params.set("limit", String(query.limit));
  if (query?.offset) params.set("offset", String(query.offset));
  const suffix = params.toString() ? `?${params.toString()}` : "";
  return apiRequest<AuditEntry[]>(`/audit-logs${suffix}`);
}
