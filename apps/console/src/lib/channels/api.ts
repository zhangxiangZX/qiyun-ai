import { apiRequest } from "@/lib/api/client";
import { PUBLIC_ENTRY_URL } from "@/lib/brand";
import type { SalesLink, SalesLinkChannel } from "@/lib/channels/types";

interface SalesLinkApiItem {
  id: string;
  name: string;
  slug: string;
  channel: SalesLinkChannel | "other";
  channelLabel: string;
  shortUrl: string;
  targetUrl: string | null;
  visits: number;
  inquiries: number;
  conversions: number;
  conversionRate: number;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}

export interface SalesLinkView extends SalesLink {
  slug: string;
  targetUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Keep path (`/public/...`) distinct from legacy host codes (`qiyun.ai/xxx`). */
function normalizeShortUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("/")) return trimmed;
  return trimmed;
}

function resolveSalesLinkBaseUrl(): string {
  const entry = process.env.NEXT_PUBLIC_ENTRY_URL?.replace(/\/$/, "");
  if (entry) return entry;
  const api = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "");
  if (api) return api;
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return PUBLIC_ENTRY_URL;
}

function toSalesLinkPath(raw: string, slug: string): string {
  const value = raw.trim();
  if (!value) return `/public/sales-links/${slug}`;

  if (/^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      // Repair bad joins like https://public/sales-links/...
      if (url.hostname === "public") {
        return `/public${url.pathname}${url.search}`.replace(/\/{2,}/g, "/");
      }
      return ""; // signal: already absolute, use as-is
    } catch {
      return `/public/sales-links/${slug}`;
    }
  }

  if (value.startsWith("/")) return value;
  if (value.startsWith("public/") || value.includes("/sales-links/")) {
    return `/${value.replace(/^\/+/, "")}`;
  }
  return ""; // legacy host/path short code
}

export function mapSalesLinkApiItem(item: SalesLinkApiItem): SalesLinkView {
  return {
    id: item.id,
    name: item.name,
    channel: item.channel === "other" ? "pc" : item.channel,
    channelLabel: item.channelLabel,
    creator: "当前工作区",
    shortUrl: normalizeShortUrl(item.shortUrl),
    visits: item.visits,
    inquiries: item.inquiries,
    conversions: item.conversions,
    conversionRate: item.conversionRate,
    status: item.status,
    lastUpdated: item.updatedAt,
    slug: item.slug,
    targetUrl: item.targetUrl,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

export async function listSalesLinks(): Promise<SalesLinkView[]> {
  const result = await apiRequest<SalesLinkApiItem[]>("/sales-links");
  return result.map(mapSalesLinkApiItem);
}

export async function getSalesLink(id: string): Promise<SalesLinkView> {
  const result = await apiRequest<SalesLinkApiItem>(`/sales-links/${encodeURIComponent(id)}`);
  return mapSalesLinkApiItem(result);
}

export async function createSalesLink(input: {
  name: string;
  channel?: SalesLinkChannel | "other";
  targetUrl?: string;
  slug?: string;
}): Promise<SalesLinkView> {
  const result = await apiRequest<SalesLinkApiItem>("/sales-links", {
    method: "POST",
    body: input,
  });
  return mapSalesLinkApiItem(result);
}

export async function updateSalesLink(
  id: string,
  patch: { status?: "active" | "inactive"; name?: string },
): Promise<SalesLinkView> {
  const result = await apiRequest<SalesLinkApiItem>(`/sales-links/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: patch,
  });
  return mapSalesLinkApiItem(result);
}

export function resolveSalesLinkPublicUrl(
  link: Pick<SalesLinkView, "shortUrl" | "slug">,
): string {
  const raw = link.shortUrl?.trim() ?? "";
  const base = resolveSalesLinkBaseUrl();

  if (/^https?:\/\//i.test(raw)) {
    try {
      const url = new URL(raw);
      if (url.hostname === "public") {
        return `${base}/public${url.pathname}${url.search}`.replace(/([^:]\/)\/+/g, "$1");
      }
      return raw;
    } catch {
      return `${base}/public/sales-links/${link.slug}`;
    }
  }

  const path = toSalesLinkPath(raw, link.slug);
  if (!path) {
    // Legacy mock codes like "qiyun.ai/1r6lx7k"
    return `https://${raw}`;
  }
  return `${base}${path}`;
}

export type SalesLinkScanSource = "link" | "qrcode" | "unknown" | "other";

export interface SalesLinkScanLog {
  id: string;
  workspaceId: string;
  salesLinkId: string;
  source: SalesLinkScanSource;
  visitor: string | null;
  referer: string | null;
  userAgent: string | null;
  scannedAt: string;
}

export async function getSalesLinkScanLogs(id: string): Promise<SalesLinkScanLog[]> {
  const result = await apiRequest<SalesLinkScanLog[]>(
    `/sales-links/${encodeURIComponent(id)}/scan-logs`,
  );
  return Array.isArray(result) ? result : [];
}

const SCAN_REFERERS = [
  "https://www.google.com/",
  "https://www.bing.com/",
  "https://weixin.qq.com/",
  "https://www.douyin.com/",
  "https://www.linkedin.com/",
  "https://mail.qq.com/",
  "",
];

const SCAN_USER_AGENTS = [
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
  "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120.0 Mobile",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15",
];

/** Deterministic mock scan logs for preview mode so the detail UI is not empty. */
export function buildMockScanLogs(seed: string, count = 36): SalesLinkScanLog[] {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const logs: SalesLinkScanLog[] = [];
  const now = Date.now();
  for (let i = 0; i < count; i += 1) {
    hash = (hash * 1103515245 + 12345) >>> 0;
    const isQr = hash % 3 === 0;
    const daysAgo = (hash % 7) + (i % 3 === 0 ? 0 : 0);
    const scannedAt = new Date(now - daysAgo * 86400000 - (hash % 86400000)).toISOString();
    logs.push({
      id: `scan_mock_${i}`,
      workspaceId: "preview",
      salesLinkId: seed,
      source: isQr ? "qrcode" : "link",
      visitor: null,
      referer: SCAN_REFERERS[hash % SCAN_REFERERS.length] || null,
      userAgent: SCAN_USER_AGENTS[hash % SCAN_USER_AGENTS.length],
      scannedAt,
    });
  }
  return logs.sort((a, b) => new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime());
}
