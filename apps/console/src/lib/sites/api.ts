import { apiRequest } from "@/lib/api/client";
import { unwrapEnvelope } from "@/lib/api/envelope";
import { ApiError, normalizeApiErrorCode } from "@/lib/api/errors";
import { WIDGET_ASSET_VERSION } from "@/generated/widget-version";
import type { SiteConfig, SiteKeyRotationResult, TestMessageRequest, TestMessageResult } from "@/lib/sites/types";

interface ApiSite {
  id: string;
  botId: string;
  name: string;
  siteKeyPrefix: string;
  allowedDomains: string[];
  status: "active" | "disabled";
}

interface ApiSiteSecret {
  site: ApiSite;
  revealedSiteKey: string;
}

export interface SiteInstallCheck {
  siteId: string;
  installed: boolean;
  lastSeenAt: string | null;
  verifiedBy: "widget_request" | "none";
}

export function checkSiteInstallOnApi(siteId: string): Promise<SiteInstallCheck> {
  return apiRequest<SiteInstallCheck>(`/sites/${encodeURIComponent(siteId)}/check-install`);
}

function resolveWidgetAssetVersion(): string {
  return process.env.NEXT_PUBLIC_WIDGET_ASSET_VERSION?.trim() || WIDGET_ASSET_VERSION;
}

function resolveWidgetScriptUrl(): string {
  const base =
    process.env.NEXT_PUBLIC_WIDGET_URL?.replace(/\/$/, "") ||
    "https://cdn.qiyuntu.cn";
  const version = resolveWidgetAssetVersion();
  if (!base) {
    return `https://cdn.qiyuntu.cn/public/widget.js?v=${version}`;
  }
  return `${base}/public/widget.js?v=${version}`;
}

function resolveWidgetApiBase(): string {
  return (
    process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
    "https://api.qiyuntu.cn"
  );
}

function buildEmbedSnippet(botId: string, siteKey: string): string {
  const src = resolveWidgetScriptUrl();
  const apiBase = resolveWidgetApiBase();
  const apiBaseAttr = apiBase ? ` data-api-base="${apiBase}"` : "";
  return `<script src="${src}"${apiBaseAttr} data-bot-id="${botId}" data-site-key="${siteKey}" async></script>`;
}

export function mapApiSite(
  site: ApiSite,
  botName?: string,
  revealedSiteKey?: string | null,
): SiteConfig {
  return {
    id: site.id,
    botId: site.botId,
    botName: botName ?? site.name,
    allowedDomains: site.allowedDomains,
    siteKeyPrefix: site.siteKeyPrefix,
    embedSnippet: revealedSiteKey ? buildEmbedSnippet(site.botId, revealedSiteKey) : null,
    updatedAt: new Date().toISOString(),
  };
}

export async function listSitesFromApi(): Promise<SiteConfig[]> {
  const [sites, bots] = await Promise.all([
    apiRequest<ApiSite[]>("/sites"),
    apiRequest<Array<{ id: string; name: string }>>("/bots"),
  ]);
  const botNames = new Map(bots.map((bot) => [bot.id, bot.name]));
  return sites.map((site) => mapApiSite(site, botNames.get(site.botId)));
}

export async function createSiteOnApi(input: {
  botId: string;
  name: string;
  allowedDomains: string[];
}): Promise<{ site: SiteConfig; revealedSiteKey: string }> {
  const payload = await apiRequest<ApiSiteSecret>("/sites", {
    method: "POST",
    body: input,
  });
  return {
    site: mapApiSite(payload.site, undefined, payload.revealedSiteKey),
    revealedSiteKey: payload.revealedSiteKey,
  };
}

export async function rotateSiteKeyOnApi(siteId: string): Promise<SiteKeyRotationResult> {
  const payload = await apiRequest<ApiSiteSecret>(`/sites/${siteId}/rotate-key`, {
    method: "POST",
  });
  return {
    site: mapApiSite(payload.site, undefined, payload.revealedSiteKey),
    revealedSiteKey: payload.revealedSiteKey,
  };
}

export async function patchSiteDomainsOnApi(
  siteId: string,
  allowedDomains: string[],
): Promise<SiteConfig> {
  return patchSiteOnApi(siteId, { allowedDomains });
}

export async function patchSiteOnApi(
  siteId: string,
  patch: { allowedDomains?: string[]; name?: string; status?: "active" | "disabled" },
): Promise<SiteConfig> {
  const site = await apiRequest<ApiSite>(`/sites/${siteId}`, {
    method: "PATCH",
    body: patch,
  });
  return mapApiSite(site);
}

export async function deleteSiteOnApi(siteId: string): Promise<void> {
  await apiRequest(`/sites/${siteId}`, { method: "DELETE" });
}

export async function testSiteMessageOnApi(
  siteId: string,
  request: TestMessageRequest,
): Promise<TestMessageResult> {
  const response = await fetch(`/api/sites/${siteId}/test-message`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(request),
    cache: "no-store",
  });

  if (!response.ok) {
    let code = normalizeApiErrorCode(response.status);
    let message = `Test message failed (${response.status}).`;
    try {
      const payload = (await response.json()) as { code?: string; message?: string };
      code = normalizeApiErrorCode(response.status, payload.code);
      if (payload.message) message = payload.message;
    } catch {
      // ignore
    }
    throw new ApiError(response.status, code, message);
  }

  return unwrapEnvelope<TestMessageResult>(await response.json());
}
