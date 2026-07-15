import { apiRequest } from "@/lib/api/client";
import {
  enrichLeadDetail,
  normalizeLeadAttachments,
  normalizeLeadFollowUpRecords,
} from "@/lib/leads/enrichment";
import type { LeadDetail, LeadFilters, LeadListItem, LeadStatus } from "@/lib/leads/types";

export type ApiLead = LeadDetail;

export function applyLeadFilters(items: LeadListItem[], filters: LeadFilters): LeadListItem[] {
  let result = items;

  if (filters.query.trim()) {
    const query = filters.query.trim().toLowerCase();
    result = result.filter(
      (item) =>
        item.name.toLowerCase().includes(query) ||
        item.contact.toLowerCase().includes(query) ||
        item.lastQuestion.toLowerCase().includes(query) ||
        item.sourceBot.toLowerCase().includes(query),
    );
  }

  if (filters.status !== "all") {
    result = result.filter((item) => item.status === filters.status);
  }

  if (filters.botId !== "all") {
    result = result.filter((item) => item.sourceBotId === filters.botId);
  }

  if (filters.assignee !== "all") {
    if (filters.assignee === "unassigned") {
      result = result.filter((item) => !item.assignee);
    } else {
      result = result.filter((item) => item.assignee === filters.assignee);
    }
  }

  return result.sort(
    (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
  );
}

export async function listAllLeadsFromApi(): Promise<LeadListItem[]> {
  const items = await apiRequest<ApiLead[]>("/leads");
  return items.map((item) => ({
    id: item.id,
    name: item.name,
    contact: item.contact,
    sourceBotId: item.sourceBotId,
    sourceBot: item.sourceBot,
    lastQuestion: item.lastQuestion,
    summary: item.summary ?? null,
    sourceSiteId: item.sourceSiteId ?? null,
    sourceSiteName: item.sourceSiteName ?? null,
    status: item.status,
    assignee: item.assignee,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  }));
}

export async function listLeadsFromApi(filters: LeadFilters): Promise<LeadListItem[]> {
  const items = await listAllLeadsFromApi();
  return applyLeadFilters(items, filters);
}

export async function getLeadFromApi(id: string): Promise<LeadDetail | null> {
  try {
    const raw = await apiRequest<LeadDetail & { attachments?: unknown; followUpRecords?: unknown }>(
      `/leads/${id}`,
    );
    const attachments = normalizeLeadAttachments(raw.attachments).map((attachment) => {
      // Construct download URL for attachments that don't already have one
      if (!attachment.downloadUrl && attachment.status !== "failed" && attachment.id) {
        attachment.downloadUrl = `/api/leads/${id}/attachments/${attachment.id}`;
      }
      return attachment;
    });
    return enrichLeadDetail({
      ...raw,
      attachments,
      followUpRecords: normalizeLeadFollowUpRecords(raw.followUpRecords),
    });
  } catch {
    const items = await apiRequest<LeadDetail[]>("/leads");
    const found = items.find((item) => item.id === id);
    return found ? enrichLeadDetail(found) : null;
  }
}

export async function patchLeadOnApi(
  id: string,
  patch: { status?: LeadStatus; assignee?: string | null; notes?: string },
): Promise<LeadDetail> {
  const raw = await apiRequest<LeadDetail & { attachments?: unknown; followUpRecords?: unknown }>(
    `/leads/${id}`,
    {
      method: "PATCH",
      body: patch,
    },
  );
  const attachments = normalizeLeadAttachments(raw.attachments).map((attachment) => {
    if (!attachment.downloadUrl && attachment.status !== "failed" && attachment.id) {
      attachment.downloadUrl = `/api/leads/${id}/attachments/${attachment.id}`;
    }
    return attachment;
  });
  return enrichLeadDetail({
    ...raw,
    attachments,
    followUpRecords: normalizeLeadFollowUpRecords(raw.followUpRecords),
  });
}

export async function listLeadBotOptionsFromApi(): Promise<Array<{ id: string; name: string }>> {
  const bots = await apiRequest<Array<{ id: string; name: string }>>("/bots");
  return bots.map((bot) => ({ id: bot.id, name: bot.name }));
}

export async function createLeadOnApi(input: {
  name: string;
  contact?: string;
  sourceBot?: string;
  lastQuestion?: string;
}): Promise<LeadListItem> {
  const item = await apiRequest<ApiLead>("/leads", {
    method: "POST",
    body: input,
  });
  return {
    id: item.id,
    name: item.name,
    contact: item.contact,
    sourceBotId: item.sourceBotId,
    sourceBot: item.sourceBot,
    lastQuestion: item.lastQuestion,
    summary: item.summary ?? null,
    sourceSiteId: item.sourceSiteId ?? null,
    sourceSiteName: item.sourceSiteName ?? null,
    status: item.status,
    assignee: item.assignee,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}
