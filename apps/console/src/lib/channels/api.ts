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

function normalizeShortUrl(value: string): string {
  return value.replace(/^https?:\/\//, "").replace(/^\//, "");
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
  const raw = link.shortUrl?.trim();
  if (!raw) {
    return `${PUBLIC_ENTRY_URL}/public/sales-links/${link.slug}`;
  }
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    return raw;
  }
  if (raw.startsWith("/")) {
    return `${PUBLIC_ENTRY_URL}${raw}`;
  }
  return `https://${raw}`;
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
