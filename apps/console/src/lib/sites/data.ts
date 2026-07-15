import { fetchConsoleMode, isPreviewMode } from "@/lib/api/mode";
import {
  createSiteOnApi,
  deleteSiteOnApi,
  listSitesFromApi,
  patchSiteDomainsOnApi,
  patchSiteOnApi,
  rotateSiteKeyOnApi,
} from "@/lib/sites/api";
import { getSitesCapabilities } from "@/lib/sites/capabilities";
import {
  fetchSites,
  rotateSiteKey,
  saveSiteDomains,
  sendTestMessage,
} from "@/lib/sites/mock-data";
import type { SiteConfig, SiteKeyRotationResult, TestMessageRequest, TestMessageResult } from "@/lib/sites/types";
import { t } from "@/lib/i18n";
import { defaultLocale } from "@/lib/messages";

export {
  getSitesCapabilities,
  SITES_UPSTREAM_DOMAIN_PATCH_ENABLED,
  SITES_TEST_MESSAGE_UPSTREAM_ENABLED,
  type SitesCapabilities,
} from "@/lib/sites/capabilities";

/** @deprecated Use getSitesCapabilities(). BFF 路由已就绪。 */
export const SITES_API_AVAILABLE = true;

export async function canPersistSiteDomains(): Promise<boolean> {
  const capabilities = await getSitesCapabilities();
  return capabilities.canSaveDomains;
}

export async function listSites(): Promise<SiteConfig[]> {
  const mode = await fetchConsoleMode();
  if (isPreviewMode(mode)) {
    return fetchSites();
  }
  return listSitesFromApi();
}

export async function createSite(input: {
  botId: string;
  name: string;
  allowedDomains: string[];
}): Promise<{ site: SiteConfig; revealedSiteKey: string } | null> {
  const capabilities = await getSitesCapabilities();
  if (capabilities.dataMode === "preview") {
    return null;
  }
  return createSiteOnApi(input);
}

export async function updateSite(
  siteId: string,
  patch: { allowedDomains?: string[]; name?: string; status?: "active" | "disabled" },
): Promise<SiteConfig | null> {
  const capabilities = await getSitesCapabilities();
  if (capabilities.dataMode === "preview") {
    return saveSiteDomains(siteId, patch.allowedDomains ?? []);
  }
  if (!capabilities.canSaveDomains) {
    throw new Error(
      capabilities.domainsReadOnlyReason ??
        t(defaultLocale, "sites.mode.upstreamDomainReadOnly"),
    );
  }
  return patchSiteOnApi(siteId, patch);
}

export async function deleteSite(siteId: string): Promise<boolean> {
  const capabilities = await getSitesCapabilities();
  if (capabilities.dataMode === "preview") {
    return true;
  }
  await deleteSiteOnApi(siteId);
  return true;
}

export async function saveDomains(
  siteId: string,
  allowedDomains: string[],
): Promise<SiteConfig | null> {
  const capabilities = await getSitesCapabilities();

  if (capabilities.dataMode === "preview") {
    return saveSiteDomains(siteId, allowedDomains);
  }

  if (!capabilities.canSaveDomains) {
    throw new Error(
      capabilities.domainsReadOnlyReason ??
        t(defaultLocale, "sites.mode.upstreamDomainReadOnly"),
    );
  }

  return patchSiteDomainsOnApi(siteId, allowedDomains);
}

export async function rotateKey(siteId: string): Promise<SiteKeyRotationResult | null> {
  const capabilities = await getSitesCapabilities();

  if (capabilities.dataMode === "preview") {
    return rotateSiteKey(siteId);
  }

  if (!capabilities.canRotateKey) {
    throw new Error("站点密钥轮换接口暂不可用，请稍后重试。");
  }

  return rotateSiteKeyOnApi(siteId);
}

export async function testMessage(
  site: SiteConfig,
  request: TestMessageRequest,
): Promise<TestMessageResult> {
  const capabilities = await getSitesCapabilities();
  if (capabilities.dataMode === "upstream" && capabilities.canTestMessage) {
    const { testSiteMessageOnApi } = await import("@/lib/sites/api");
    return testSiteMessageOnApi(site.id, request);
  }
  return sendTestMessage(site, request);
}
