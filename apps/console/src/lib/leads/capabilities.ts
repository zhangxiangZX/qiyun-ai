import { fetchConsoleMode, isPreviewMode } from "@/lib/api/mode";
import { t } from "@/lib/i18n";
import { defaultLocale } from "@/lib/messages";

/**
 * BFF 已代理 /api/leads；上游 GET/PATCH /leads/:id 已就绪。
 */
export const LEADS_BFF_READY = true;

/**
 * Upstream 线索读写已开启。
 */
export const LEADS_UPSTREAM_WRITE_ENABLED = true;

export type LeadsDataMode = "preview" | "upstream";

export interface LeadsCapabilities {
  dataMode: LeadsDataMode;
  canReadList: boolean;
  canUpdate: boolean;
  canExport: boolean;
  readOnlyReason?: string;
  previewSaveHint: string;
}

export async function getLeadsCapabilities(): Promise<LeadsCapabilities> {
  const mode = await fetchConsoleMode();
  const preview = isPreviewMode(mode);

  if (preview) {
    return {
      dataMode: "preview",
      canReadList: true,
      canUpdate: true,
      canExport: true,
      previewSaveHint: t(defaultLocale, "leads.mode.previewSave"),
    };
  }

  const canUpdate = LEADS_UPSTREAM_WRITE_ENABLED;

  return {
    dataMode: "upstream",
    canReadList: LEADS_BFF_READY,
    canUpdate,
    canExport: LEADS_BFF_READY,
    readOnlyReason: canUpdate
      ? undefined
      : t(defaultLocale, "leads.mode.upstreamReadOnly"),
    previewSaveHint: t(defaultLocale, "leads.mode.upstreamWriteReady"),
  };
}
