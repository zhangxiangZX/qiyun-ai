import { fetchConsoleMode, isPreviewMode } from "@/lib/api/mode";
import {
  fetchSites,
  rotateSiteKey,
  saveSiteDomains,
  sendTestMessage,
} from "@/lib/sites/mock-data";
import type { SiteConfig, TestMessageRequest, TestMessageResult } from "@/lib/sites/types";

export const SITES_API_AVAILABLE = false;

export async function listSites(): Promise<SiteConfig[]> {
  const mode = await fetchConsoleMode();
  if (isPreviewMode(mode) || !SITES_API_AVAILABLE) {
    return fetchSites();
  }
  throw new Error("Sites API is not available yet.");
}

export async function saveDomains(
  siteId: string,
  allowedDomains: string[],
): Promise<SiteConfig | null> {
  const mode = await fetchConsoleMode();
  if (isPreviewMode(mode) || !SITES_API_AVAILABLE) {
    return saveSiteDomains(siteId, allowedDomains);
  }
  throw new Error("Sites API is not available yet.");
}

export async function rotateKey(siteId: string): Promise<SiteConfig | null> {
  const mode = await fetchConsoleMode();
  if (isPreviewMode(mode) || !SITES_API_AVAILABLE) {
    return rotateSiteKey(siteId);
  }
  throw new Error("Sites API is not available yet.");
}

export async function testMessage(
  site: SiteConfig,
  request: TestMessageRequest,
): Promise<TestMessageResult> {
  const mode = await fetchConsoleMode();
  if (isPreviewMode(mode) || !SITES_API_AVAILABLE) {
    return sendTestMessage(site, request);
  }
  throw new Error("Sites API is not available yet.");
}
