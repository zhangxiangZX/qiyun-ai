import { fetchConsoleMode, isPreviewMode } from "@/lib/api/mode";
import { t } from "@/lib/i18n";
import { defaultLocale } from "@/lib/messages";

/**
 * 上游 PATCH /bots/:id 已支持 name / status / knowledgeBaseIds。
 * 扩展字段（welcomeMessage、systemPrompt 等）已由上游 P0-3 支持。
 */
export const BOTS_UPSTREAM_EXTENDED_FIELDS_ENABLED = true;

export type BotsDataMode = "preview" | "upstream";

export interface BotsCapabilities {
  dataMode: BotsDataMode;
  canPersistCore: boolean;
  canPersistExtendedFields: boolean;
  extendedFieldsReadOnlyReason?: string;
}

export async function getBotsCapabilities(): Promise<BotsCapabilities> {
  const mode = await fetchConsoleMode();
  const preview = isPreviewMode(mode);

  if (preview) {
    return {
      dataMode: "preview",
      canPersistCore: false,
      canPersistExtendedFields: false,
      extendedFieldsReadOnlyReason: t(defaultLocale, "bots.mode.previewReadOnly"),
    };
  }

  const canPersistExtendedFields = BOTS_UPSTREAM_EXTENDED_FIELDS_ENABLED;

  return {
    dataMode: "upstream",
    canPersistCore: true,
    canPersistExtendedFields,
    extendedFieldsReadOnlyReason: canPersistExtendedFields
      ? undefined
      : t(defaultLocale, "bots.mode.upstreamExtendedReadOnly"),
  };
}
