import { fetchConsoleMode, isPreviewMode } from "@/lib/api/mode";
import {
  applyLeadFilters,
  createLeadOnApi,
  getLeadFromApi,
  listAllLeadsFromApi,
  listLeadBotOptionsFromApi,
  patchLeadOnApi,
} from "@/lib/leads/api";
import { getLeadsCapabilities } from "@/lib/leads/capabilities";
import {
  fetchLeadDetail,
  fetchLeads,
  getAssigneeOptions,
  getBotFilterOptions,
  getLeadsForExport,
  updateLead,
} from "@/lib/leads/mock-data";
import type { LeadDetail, LeadFilters, LeadListItem, LeadStatus } from "@/lib/leads/types";
import { t } from "@/lib/i18n";
import { defaultLocale } from "@/lib/messages";

export {
  getLeadsCapabilities,
  LEADS_UPSTREAM_WRITE_ENABLED,
  type LeadsCapabilities,
} from "@/lib/leads/capabilities";
export { applyLeadFilters, listAllLeadsFromApi } from "@/lib/leads/api";

/**
 * Create a lead. In upstream mode, calls POST /leads.
 * In preview mode, returns a local-only lead.
 */
export async function createLead(input: {
  name: string;
  contact?: string;
  sourceBot?: string;
  lastQuestion?: string;
}): Promise<{ item: LeadListItem; preview: boolean }> {
  const capabilities = await getLeadsCapabilities();
  if (capabilities.dataMode === "preview") {
    const now = new Date().toISOString();
    return {
      item: {
        id: crypto.randomUUID(),
        name: input.name,
        contact: input.contact?.trim() || "—",
        sourceBotId: "manual",
        sourceBot: input.sourceBot?.trim() || "手动创建",
        lastQuestion: input.lastQuestion?.trim() || "（暂无对话）",
        summary: null,
        sourceSiteId: null,
        sourceSiteName: null,
        status: "new",
        assignee: null,
        createdAt: now,
        updatedAt: now,
      },
      preview: true,
    };
  }
  const item = await createLeadOnApi(input);
  return { item, preview: false };
}

/** @deprecated Use getLeadsCapabilities(). BFF 路由已就绪。 */
export const LEADS_API_AVAILABLE = true;

export async function listAllLeads(): Promise<LeadListItem[]> {
  const mode = await fetchConsoleMode();
  if (isPreviewMode(mode)) {
    return fetchLeads({ query: "", status: "all", botId: "all", assignee: "all" });
  }
  return listAllLeadsFromApi();
}

export async function listLeads(filters: LeadFilters): Promise<LeadListItem[]> {
  const mode = await fetchConsoleMode();
  if (isPreviewMode(mode)) {
    return fetchLeads(filters);
  }
  const all = await listAllLeadsFromApi();
  return applyLeadFilters(all, filters);
}

export async function getLeadDetail(id: string): Promise<LeadDetail | null> {
  const mode = await fetchConsoleMode();
  if (isPreviewMode(mode)) {
    return fetchLeadDetail(id);
  }
  return getLeadFromApi(id);
}

export async function saveLeadUpdate(
  id: string,
  patch: { status?: LeadStatus; assignee?: string | null; notes?: string },
): Promise<LeadDetail | null> {
  const capabilities = await getLeadsCapabilities();

  if (capabilities.dataMode === "preview") {
    return updateLead(id, patch);
  }

  if (!capabilities.canUpdate) {
    throw new Error(
      capabilities.readOnlyReason ?? t(defaultLocale, "leads.mode.upstreamReadOnly"),
    );
  }

  return patchLeadOnApi(id, patch);
}

export async function loadBotFilterOptions() {
  const mode = await fetchConsoleMode();
  if (isPreviewMode(mode)) {
    return getBotFilterOptions();
  }
  return listLeadBotOptionsFromApi();
}

export function getLeadsForExportFromItems(items: LeadListItem[]): LeadDetail[] {
  return items.map((item) => ({
    ...item,
    conversationId: null,
    notes: "",
  }));
}

export async function resolveLeadsForExport(
  filters: LeadFilters,
  filteredItems: LeadListItem[],
): Promise<LeadDetail[]> {
  const capabilities = await getLeadsCapabilities();
  if (capabilities.dataMode === "preview") {
    return getLeadsForExport(filters);
  }
  return getLeadsForExportFromItems(filteredItems);
}

export { getAssigneeOptions };
