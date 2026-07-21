import { apiRequest } from "@/lib/api/client";
import type {
  QuotePreviewSample,
  QuoteTemplate,
  QuoteTemplateConfig,
  QuoteTemplateTerms,
  TemplateLogoPosition,
} from "@/lib/quotes/template-types";

export interface QuoteDocumentPayload {
  template: QuoteTemplate;
  sample: QuotePreviewSample;
  html: string;
}

export interface QuoteTemplatePreviewPayload {
  template: QuoteTemplate;
  sample: QuotePreviewSample;
  html: string;
}

export async function listQuoteTemplates(): Promise<QuoteTemplate[]> {
  return apiRequest<QuoteTemplate[]>("/quote-templates");
}

export async function getQuoteTemplate(id: string): Promise<QuoteTemplate> {
  return apiRequest<QuoteTemplate>(`/quote-templates/${id}`);
}

export async function createQuoteTemplate(input: {
  templateName: string;
  companyName?: string;
  description?: string;
  themeColor?: string;
  logoPosition?: TemplateLogoPosition;
  showCompanyInfo?: boolean;
  showCustomerInfo?: boolean;
  fields?: string[];
  terms?: Partial<QuoteTemplateTerms>;
  isDefault?: boolean;
}): Promise<QuoteTemplate> {
  return apiRequest<QuoteTemplate>("/quote-templates", { method: "POST", body: input });
}

export async function updateQuoteTemplate(
  id: string,
  patch: Partial<
    QuoteTemplateConfig & {
      companyName: string;
      description: string;
      isDefault: boolean;
    }
  >,
): Promise<QuoteTemplate> {
  return apiRequest<QuoteTemplate>(`/quote-templates/${id}`, { method: "PATCH", body: patch });
}

export async function deleteQuoteTemplate(id: string): Promise<{ ok: boolean }> {
  return apiRequest<{ ok: boolean }>(`/quote-templates/${id}`, { method: "DELETE" });
}

export async function setDefaultQuoteTemplate(id: string): Promise<QuoteTemplate> {
  return apiRequest<QuoteTemplate>(`/quote-templates/${id}/set-default`, { method: "POST" });
}

export async function previewQuoteTemplate(id: string): Promise<QuoteTemplatePreviewPayload> {
  return apiRequest<QuoteTemplatePreviewPayload>(`/quote-templates/${id}/preview`);
}

export async function getQuoteDocument(quoteId: string): Promise<QuoteDocumentPayload> {
  return apiRequest<QuoteDocumentPayload>(`/quote-opportunities/${quoteId}/document`);
}

export async function createQuotePublicLink(quoteId: string): Promise<{
  quoteId: string;
  token: string;
  tokenPrefix: string;
  url: string;
  createdAt: string;
}> {
  const result = await apiRequest<{
    quoteId: string;
    token: string;
    tokenPrefix: string;
    url: string;
    createdAt: string;
  }>(`/quote-opportunities/${quoteId}/public-token`, { method: "POST" });

  // Prefer Console public customer page (no dashboard login) over raw API path.
  const token = result.token?.trim();
  if (token) {
    const origin =
      typeof window !== "undefined"
        ? window.location.origin
        : (process.env.NEXT_PUBLIC_APP_URL?.trim() || process.env.APP_URL?.trim() || "");
    const path = `/q/${encodeURIComponent(token)}`;
    return {
      ...result,
      url: origin ? `${origin.replace(/\/$/, "")}${path}` : path,
    };
  }
  return result;
}
