import { apiRequest, getApiPrefix } from "@/lib/api/client";
import { ApiError, normalizeApiErrorCode } from "@/lib/api/errors";
import { WORKSPACE_ID } from "@/lib/api/workspace";
import type {
  BusinessRules,
  ChannelAttributionItem,
  ConversionFunnelStep,
  CustomerOpportunityItem,
  CustomerRecommendation,
  InquiryDetail,
  InquiryListItem,
  InquiryAssignCandidate,
  InquiryAssignStats,
  IntentLevel,
  QuoteDetail,
  QuoteListItem,
  SalesAssistantResult,
  SalesOverviewMetrics,
  SourceCodeItem,
  SourceType,
} from "@/lib/sales/types";
import type { QuickEntryExtractResponse } from "@/lib/sales/quick-entry-helpers";

function withRangeQuery(path: string, query?: { from?: string; to?: string }) {
  if (!query?.from && !query?.to) {
    return path;
  }
  const params = new URLSearchParams();
  if (query.from) params.set("from", query.from);
  if (query.to) params.set("to", query.to);
  return `${path}?${params.toString()}`;
}

export async function fetchSalesOverview(query?: {
  from?: string;
  to?: string;
}): Promise<SalesOverviewMetrics> {
  return apiRequest(withRangeQuery("/analytics/sales-overview", query));
}

export async function fetchConversionFunnel(query?: {
  from?: string;
  to?: string;
}): Promise<ConversionFunnelStep[]> {
  return apiRequest(withRangeQuery("/analytics/conversion-funnel", query));
}

export async function fetchChannelAttribution(query?: {
  from?: string;
  to?: string;
}): Promise<ChannelAttributionItem[]> {
  return apiRequest(withRangeQuery("/analytics/channel-attribution", query));
}

export async function listInquiries(query?: {
  intent?: IntentLevel;
  status?: "open" | "closed" | "all";
  limit?: number;
  unassigned?: boolean;
  q?: string;
}): Promise<InquiryListItem[]> {
  const params = new URLSearchParams();
  if (query?.intent) params.set("intent", query.intent);
  if (query?.status) params.set("status", query.status);
  if (query?.limit) params.set("limit", String(query.limit));
  if (query?.unassigned) params.set("unassigned", "true");
  if (query?.q?.trim()) params.set("q", query.q.trim());
  const suffix = params.toString() ? `?${params.toString()}` : "";
  return apiRequest<InquiryListItem[]>(`/inquiries${suffix}`);
}

export async function fetchInquiryAssignStats(): Promise<InquiryAssignStats> {
  return apiRequest<InquiryAssignStats>("/inquiries/assign-stats");
}

export async function fetchInquiryAssignCandidates(
  inquiryId: string,
): Promise<InquiryAssignCandidate[]> {
  return apiRequest<InquiryAssignCandidate[]>(
    `/inquiries/${encodeURIComponent(inquiryId)}/assign-candidates`,
  );
}

export async function getInquiry(id: string): Promise<InquiryDetail> {
  return apiRequest<InquiryDetail>(`/inquiries/${id}`);
}

export async function updateInquiry(
  id: string,
  patch: {
    ownerId?: string | null;
    nextActionAt?: string | null;
    status?: "open" | "closed";
    sourceCode?: string | null;
  },
): Promise<InquiryDetail> {
  return apiRequest<InquiryDetail>(`/inquiries/${id}`, { method: "PATCH", body: patch });
}

export async function assignInquiry(
  id: string,
  ownerId: string,
  remark?: string,
): Promise<InquiryDetail> {
  return apiRequest<InquiryDetail>(`/inquiries/${id}/assign`, {
    method: "POST",
    body: { ownerId, remark },
  });
}

export async function requestMissingFields(id: string): Promise<{
  inquiryId: string;
  missingFields: string[];
  suggestedMessage: string;
}> {
  return apiRequest(`/inquiries/${id}/request-missing-fields`, { method: "POST" });
}

export interface CreateInquiryInput {
  customerName: string;
  sourceType?: SourceType;
  summary?: string;
  customerContact?: string;
  phone?: string;
  email?: string;
  productNeed?: string;
  budget?: string;
  intentLevel?: IntentLevel;
  nextActionAt?: string;
  internalRemark?: string;
  channelLabel?: string;
}

export async function createInquiryOnApi(input: CreateInquiryInput): Promise<InquiryDetail> {
  return apiRequest<InquiryDetail>("/inquiries", { method: "POST", body: input });
}

export async function aiExtractQuickEntry(text: string): Promise<QuickEntryExtractResponse> {
  return apiRequest<QuickEntryExtractResponse>("/quick-entry/ai-extract", {
    method: "POST",
    body: { text },
  });
}

export async function checkQuickEntryDuplicate(phone: string): Promise<{
  duplicate: boolean;
  match: {
    inquiryId: string;
    customerName: string;
    customerContact: string | null;
    createdAt: string;
  } | null;
}> {
  return apiRequest("/quick-entry/check-duplicate", {
    method: "POST",
    body: { phone },
  });
}

export async function createQuickEntryInquiry(input: CreateInquiryInput): Promise<InquiryDetail> {
  return apiRequest<InquiryDetail>("/quick-entry/create-inquiry", {
    method: "POST",
    body: input,
  });
}

export async function batchAssignInquiries(
  inquiryIds: string[],
  ownerId: string,
): Promise<InquiryDetail[]> {
  return apiRequest<InquiryDetail[]>("/inquiries/batch-assign", {
    method: "POST",
    body: { inquiryIds, ownerId },
  });
}

export async function markInquiryLost(id: string): Promise<InquiryDetail> {
  return apiRequest<InquiryDetail>(`/inquiries/${id}/lost`, { method: "POST" });
}

export async function markInquiryInvalid(id: string): Promise<InquiryDetail> {
  return apiRequest<InquiryDetail>(`/inquiries/${id}/invalid`, { method: "POST" });
}

export async function convertInquiryToQuote(
  id: string,
  input?: { title?: string; estimatedAmount?: number | null },
): Promise<QuoteDetail> {
  return apiRequest<QuoteDetail>(`/inquiries/${id}/convert-to-quote`, {
    method: "POST",
    body: input ?? {},
  });
}

export async function setInquiryIntentLevel(
  id: string,
  intentLevel: IntentLevel,
): Promise<InquiryDetail> {
  return apiRequest<InquiryDetail>(`/inquiries/${id}/intent-level`, {
    method: "POST",
    body: { intentLevel },
  });
}

export async function listQuoteOpportunities(query?: {
  status?: "draft" | "to_send" | "sent" | "to_confirm" | "won" | "void" | "expiring";
  q?: string;
}): Promise<QuoteListItem[]> {
  const params = new URLSearchParams();
  if (query?.status) params.set("status", query.status);
  if (query?.q?.trim()) params.set("q", query.q.trim());
  const suffix = params.toString() ? `?${params.toString()}` : "";
  return apiRequest<QuoteListItem[]>(`/quote-opportunities${suffix}`);
}

export async function createQuoteOpportunity(input: {
  inquiryId: string;
  title?: string;
  estimatedAmount?: number | null;
  templateId?: string | null;
}): Promise<QuoteDetail> {
  return apiRequest<QuoteDetail>("/quote-opportunities", { method: "POST", body: input });
}

export type QuoteLostReason =
  | "price"
  | "delivery"
  | "spec_mismatch"
  | "project_paused"
  | "competitor"
  | "no_follow_up"
  | "other";

export async function markQuoteLost(
  id: string,
  input?: { lostReason?: QuoteLostReason },
): Promise<QuoteDetail> {
  return apiRequest<QuoteDetail>(`/quote-opportunities/${id}/lost`, {
    method: "POST",
    body: input ?? {},
  });
}

export async function getQuoteOpportunity(id: string): Promise<QuoteDetail> {
  return apiRequest<QuoteDetail>(`/quote-opportunities/${id}`);
}

export async function updateQuoteOpportunity(
  id: string,
  patch: Record<string, unknown>,
): Promise<QuoteDetail> {
  return apiRequest<QuoteDetail>(`/quote-opportunities/${id}`, { method: "PATCH", body: patch });
}

export async function addQuoteFollowUp(
  id: string,
  input: { title: string; body?: string },
): Promise<QuoteDetail> {
  return apiRequest<QuoteDetail>(`/quote-opportunities/${id}/follow-ups`, {
    method: "POST",
    body: input,
  });
}

export async function analyzeSalesAssistant(text: string): Promise<SalesAssistantResult> {
  return apiRequest<SalesAssistantResult>("/sales-assistant/analyze", {
    method: "POST",
    body: { text },
  });
}

export async function createReplyDraft(text: string): Promise<SalesAssistantResult> {
  return apiRequest<SalesAssistantResult>("/sales-assistant/reply-draft", {
    method: "POST",
    body: { text },
  });
}

export async function createRequirementSheet(text: string): Promise<{
  markdown: string;
  sheet: SalesAssistantResult["requirementSheet"];
}> {
  return apiRequest("/sales-assistant/create-requirement-sheet", {
    method: "POST",
    body: { text },
  });
}

export async function listSources(): Promise<SourceCodeItem[]> {
  return apiRequest<SourceCodeItem[]>("/sources");
}

export async function createSource(input: {
  code: string;
  label: string;
  sourceType: SourceCodeItem["sourceType"];
}): Promise<SourceCodeItem> {
  return apiRequest<SourceCodeItem>("/sources", { method: "POST", body: input });
}

export async function fetchSourceAnalytics(query?: {
  from?: string;
  to?: string;
}): Promise<Array<ChannelAttributionItem & { roi: number | null }>> {
  return apiRequest(withRangeQuery("/analytics/sources", query));
}

export async function listCustomerOpportunities(): Promise<CustomerOpportunityItem[]> {
  return apiRequest<CustomerOpportunityItem[]>("/customer-opportunities");
}

export async function fetchCustomerRecommendations(): Promise<CustomerRecommendation[]> {
  return apiRequest<CustomerRecommendation[]>("/customer-operations/recommendations");
}

export async function getBusinessRules(): Promise<BusinessRules> {
  return apiRequest<BusinessRules>("/settings/business-rules");
}

export async function updateBusinessRules(patch: Partial<BusinessRules>): Promise<BusinessRules> {
  return apiRequest<BusinessRules>("/settings/business-rules", { method: "PATCH", body: patch });
}

export function formatAmount(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "—";
  }
  return `¥${value.toLocaleString("zh-CN", { maximumFractionDigits: 0 })}`;
}

/* ----------------------------------------------------------------------------
 * Quote PDF versions & delivery logs
 * ------------------------------------------------------------------------- */

export interface QuoteDocumentVersion {
  id: string;
  version: number;
  fileName: string;
  sizeBytes: number;
  contentHash: string;
  createdBy: string | null;
  createdAt: string;
}

export interface QuoteDeliveryLog {
  id: string;
  quoteOpportunityId: string;
  quoteDocumentId: string | null;
  channel: string;
  recipient: string;
  status: string;
  errorMessage: string | null;
  createdAt: string;
  deliveredAt: string | null;
}

interface RawQuoteDocumentRow {
  id: string;
  version: number;
  file_name: string;
  size_bytes: number;
  content_hash: string;
  created_by: string | null;
  created_at: string;
}

function normalizeQuoteDocument(row: RawQuoteDocumentRow): QuoteDocumentVersion {
  return {
    id: row.id,
    version: row.version,
    fileName: row.file_name,
    sizeBytes: row.size_bytes,
    contentHash: row.content_hash,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

function normalizeDeliveryLog(row: Record<string, unknown>): QuoteDeliveryLog {
  return {
    id: String(row.id),
    quoteOpportunityId: String(row.quote_opportunity_id ?? row.quoteOpportunityId),
    quoteDocumentId: (row.quote_document_id ?? row.quoteDocumentId ?? null) as string | null,
    channel: String(row.channel ?? ""),
    recipient: String(row.recipient ?? ""),
    status: String(row.status ?? "queued"),
    errorMessage: (row.error_message ?? row.errorMessage ?? null) as string | null,
    createdAt: String(row.created_at ?? row.createdAt ?? ""),
    deliveredAt: (row.delivered_at ?? row.deliveredAt ?? null) as string | null,
  };
}

function parseDispositionFilename(contentDisposition: string | null, fallback: string): string {
  if (!contentDisposition) return fallback;
  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) return decodeURIComponent(utf8Match[1]);
  const plainMatch = contentDisposition.match(/filename="?([^";]+)"?/i);
  if (plainMatch?.[1]) return plainMatch[1];
  return fallback;
}

export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function listQuoteDocuments(quoteId: string): Promise<QuoteDocumentVersion[]> {
  const rows = await apiRequest<RawQuoteDocumentRow[]>(`/quote-opportunities/${quoteId}/documents`);
  return (Array.isArray(rows) ? rows : []).map(normalizeQuoteDocument);
}

export async function downloadQuoteDocument(
  quoteId: string,
  documentId: string,
  fallbackName = "quote.pdf",
): Promise<void> {
  const response = await fetch(
    `${getApiPrefix()}/quote-opportunities/${encodeURIComponent(quoteId)}/documents/${encodeURIComponent(documentId)}/download`,
    {
      headers: { "x-workspace-id": WORKSPACE_ID },
      credentials: "include",
      cache: "no-store",
    },
  );
  if (!response.ok) {
    throw new ApiError(response.status, normalizeApiErrorCode(response.status), "PDF 下载失败。");
  }
  const blob = await response.blob();
  const filename = parseDispositionFilename(response.headers.get("content-disposition"), fallbackName);
  triggerBlobDownload(blob, filename);
}

export async function downloadCurrentQuotePdf(quoteId: string, fallbackName = "quote.pdf"): Promise<void> {
  const response = await fetch(
    `${getApiPrefix()}/quote-opportunities/${encodeURIComponent(quoteId)}/pdf`,
    {
      headers: { "x-workspace-id": WORKSPACE_ID },
      credentials: "include",
      cache: "no-store",
    },
  );
  if (!response.ok) {
    throw new ApiError(response.status, normalizeApiErrorCode(response.status), "PDF 下载失败。");
  }
  const blob = await response.blob();
  const filename = parseDispositionFilename(response.headers.get("content-disposition"), fallbackName);
  triggerBlobDownload(blob, filename);
}

export async function listQuoteDeliveryLogs(quoteId: string): Promise<QuoteDeliveryLog[]> {
  const rows = await apiRequest<Record<string, unknown>[]>(`/quote-opportunities/${quoteId}/delivery-logs`);
  return (Array.isArray(rows) ? rows : []).map(normalizeDeliveryLog);
}

export async function retryQuoteDelivery(quoteId: string, logId: string): Promise<QuoteDeliveryLog> {
  const row = await apiRequest<Record<string, unknown>>(
    `/quote-opportunities/${quoteId}/delivery-logs/${logId}/retry`,
    { method: "POST" },
  );
  return normalizeDeliveryLog(row);
}

export async function sendQuote(
  quoteId: string,
  input: { recipient?: string; channel?: "email" | "link"; quotedAmount?: number | null },
): Promise<{ id: string; status: string }> {
  const result = await apiRequest<{ id: string; status?: string }>(
    `/quote-opportunities/${quoteId}/send`,
    { method: "POST", body: input },
  );
  return { id: result.id, status: result.status ?? "sent" };
}
