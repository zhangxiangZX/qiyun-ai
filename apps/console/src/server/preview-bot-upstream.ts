import type { NextRequest } from "next/server";

import { unwrapEnvelope } from "@/lib/api/envelope";
import { getUpstreamApiBaseUrl } from "@/server/api-config";
import { getWorkspaceContext } from "@/server/workspace";
import { buildUpstreamHeaders } from "@/server/upstream-request";

const PREVIEW_SITE_PREFIX = "Console Preview";
const previewSiteKeyCache = new Map<string, string>();

export interface PreviewBotContextPayload {
  botId: string;
  siteKey: string;
  origin: string;
}

interface ApiSite {
  id: string;
  botId: string;
  name: string;
}

interface SiteSecretPayload {
  site: ApiSite;
  revealedSiteKey: string;
}

function mapBotStatus(status: "enabled" | "disabled" | "draft"): "active" | "disabled" | "draft" {
  if (status === "enabled") return "active";
  if (status === "disabled") return "disabled";
  return "draft";
}

export function resolvePreviewOrigin(request: NextRequest): string {
  const origin = request.headers.get("origin");
  if (origin) return origin;

  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? "http";
  if (host) return `${proto}://${host.split(",")[0]?.trim()}`;

  return process.env.APP_URL?.replace(/\/$/, "") ?? "http://localhost:3010";
}

function cacheKey(workspaceId: string, botId: string): string {
  return `${workspaceId}:${botId}`;
}

async function upstreamJson<T>(
  request: NextRequest,
  path: string,
  init?: RequestInit,
): Promise<{ ok: boolean; status: number; data: T | null; message?: string }> {
  const baseUrl = getUpstreamApiBaseUrl();
  const authHeaders = await buildUpstreamHeaders(request);
  if (!baseUrl || !authHeaders) {
    return { ok: false, status: 401, data: null, message: "No active session." };
  }

  const headers = authHeaders.headers;
  if (init?.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  const response = await fetch(new URL(path, `${baseUrl}/`), {
    ...init,
    headers,
    cache: "no-store",
  });

  const text = await response.text();
  if (!response.ok) {
    try {
      const payload = JSON.parse(text) as { message?: string };
      return {
        ok: false,
        status: response.status,
        data: null,
        message: payload.message ?? text,
      };
    } catch {
      return { ok: false, status: response.status, data: null, message: text || response.statusText };
    }
  }

  if (!text) {
    return { ok: true, status: response.status, data: null };
  }

  return { ok: true, status: response.status, data: unwrapEnvelope<T>(JSON.parse(text)) };
}

export async function resolveUpstreamPreviewBotContext(
  request: NextRequest,
  botId: string,
  sync?: {
    name: string;
    status: "enabled" | "disabled" | "draft";
    knowledgeBaseIds: string[];
  },
): Promise<PreviewBotContextPayload> {
  const workspaceId = getWorkspaceContext(request).workspaceId;
  const origin = resolvePreviewOrigin(request);
  const key = cacheKey(workspaceId, botId);

  if (sync) {
    const patch = await upstreamJson(request, `/bots/${botId}`, {
      method: "PATCH",
      body: JSON.stringify({
        name: sync.name,
        status: mapBotStatus(sync.status),
        knowledgeBaseIds: sync.knowledgeBaseIds,
      }),
    });
    if (!patch.ok) {
      throw new Error(patch.message ?? "Failed to sync bot for preview.");
    }
  }

  const cachedSiteKey = previewSiteKeyCache.get(key);
  if (cachedSiteKey) {
    return { botId, siteKey: cachedSiteKey, origin };
  }

  const sitesResult = await upstreamJson<ApiSite[]>(request, "/sites");
  if (!sitesResult.ok || !sitesResult.data) {
    throw new Error(sitesResult.message ?? "Failed to load sites for preview.");
  }

  const previewSite = sitesResult.data.find(
    (site) => site.botId === botId && site.name.startsWith(PREVIEW_SITE_PREFIX),
  );

  if (previewSite) {
    const rotated = await upstreamJson<SiteSecretPayload>(
      request,
      `/sites/${previewSite.id}/rotate-key`,
      { method: "POST" },
    );
    if (!rotated.ok || !rotated.data?.revealedSiteKey) {
      throw new Error(rotated.message ?? "Failed to prepare preview site key.");
    }
    previewSiteKeyCache.set(key, rotated.data.revealedSiteKey);
    return { botId, siteKey: rotated.data.revealedSiteKey, origin };
  }

  const created = await upstreamJson<SiteSecretPayload>(request, "/sites", {
    method: "POST",
    body: JSON.stringify({
      botId,
      name: `${PREVIEW_SITE_PREFIX} (${botId})`,
      allowedDomains: ["localhost", "127.0.0.1"],
      status: "active",
    }),
  });

  if (!created.ok || !created.data?.revealedSiteKey) {
    throw new Error(created.message ?? "Failed to create preview site.");
  }

  previewSiteKeyCache.set(key, created.data.revealedSiteKey);
  return { botId, siteKey: created.data.revealedSiteKey, origin };
}
