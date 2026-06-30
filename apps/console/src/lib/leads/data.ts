import { fetchConsoleMode, isPreviewMode } from "@/lib/api/mode";
import {
  fetchLeadDetail,
  fetchLeads,
  getAssigneeOptions,
  getBotFilterOptions,
  getLeadsForExport,
  updateLead,
} from "@/lib/leads/mock-data";
import type { LeadDetail, LeadFilters, LeadListItem, LeadStatus } from "@/lib/leads/types";

export const LEADS_API_AVAILABLE = false;

export async function listLeads(filters: LeadFilters): Promise<LeadListItem[]> {
  const mode = await fetchConsoleMode();
  if (isPreviewMode(mode) || !LEADS_API_AVAILABLE) {
    return fetchLeads(filters);
  }
  throw new Error("Leads list API is not available yet.");
}

export async function getLeadDetail(id: string): Promise<LeadDetail | null> {
  return fetchLeadDetail(id);
}

export async function saveLeadUpdate(
  id: string,
  patch: { status?: LeadStatus; assignee?: string | null; notes?: string },
): Promise<LeadDetail | null> {
  const mode = await fetchConsoleMode();
  if (isPreviewMode(mode) || !LEADS_API_AVAILABLE) {
    return updateLead(id, patch);
  }
  throw new Error("Leads update API is not available yet.");
}

export { getAssigneeOptions, getBotFilterOptions, getLeadsForExport };
