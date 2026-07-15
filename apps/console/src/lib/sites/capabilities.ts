import { fetchConsoleMode, isPreviewMode } from "@/lib/api/mode";
import { t } from "@/lib/i18n";
import { defaultLocale } from "@/lib/messages";

/**
 * BFF 已代理 GET /sites 与 POST rotate-key。
 */
export const SITES_BFF_READY = true;

/**
 * 上游 PATCH /sites/:id（域名白名单）已就绪。
 */
export const SITES_UPSTREAM_DOMAIN_PATCH_ENABLED = true;

/**
 * 测试消息走 BFF 代理至上游公共聊天接口。
 */
export const SITES_TEST_MESSAGE_UPSTREAM_ENABLED = true;

export type SitesDataMode = "preview" | "upstream";

export interface SitesCapabilities {
  dataMode: SitesDataMode;
  canReadList: boolean;
  canRotateKey: boolean;
  canSaveDomains: boolean;
  canTestMessage: boolean;
  domainsReadOnlyReason?: string;
  testMessageHint: string;
  syncStatusLabel: string;
}

export async function getSitesCapabilities(): Promise<SitesCapabilities> {
  const mode = await fetchConsoleMode();
  const preview = isPreviewMode(mode);

  if (preview) {
    return {
      dataMode: "preview",
      canReadList: true,
      canRotateKey: true,
      canSaveDomains: true,
      canTestMessage: true,
      testMessageHint: t(defaultLocale, "sites.mode.testPreviewOnly"),
      syncStatusLabel: t(defaultLocale, "sites.mode.syncPreview"),
    };
  }

  const canSaveDomains = SITES_UPSTREAM_DOMAIN_PATCH_ENABLED;

  return {
    dataMode: "upstream",
    canReadList: SITES_BFF_READY,
    canRotateKey: SITES_BFF_READY,
    canSaveDomains,
    canTestMessage: SITES_TEST_MESSAGE_UPSTREAM_ENABLED,
    domainsReadOnlyReason: canSaveDomains
      ? undefined
      : t(defaultLocale, "sites.mode.upstreamDomainReadOnly"),
    testMessageHint: SITES_TEST_MESSAGE_UPSTREAM_ENABLED
      ? t(defaultLocale, "sites.mode.testUpstream")
      : t(defaultLocale, "sites.mode.testPreviewOnly"),
    syncStatusLabel: t(defaultLocale, "sites.mode.syncUpstream"),
  };
}
