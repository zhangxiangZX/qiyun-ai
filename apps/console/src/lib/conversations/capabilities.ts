import { fetchConsoleMode, isPreviewMode } from "@/lib/api/mode";
import { t } from "@/lib/i18n";
import { defaultLocale } from "@/lib/messages";

/**
 * 上游 GET /conversations 尚未支持 botId / hasLead / status / q 等筛选参数。
 * Codex 就绪后改为 true，并同步 BFF 查询参数透传。
 */
export const CONVERSATIONS_SERVER_FILTER_ENABLED = true;

export type ConversationsDataMode = "preview" | "upstream";

export interface ConversationsCapabilities {
  dataMode: ConversationsDataMode;
  serverFiltersEnabled: boolean;
  clientFilterHint: string;
  paginationHint: string;
}

export async function getConversationsCapabilities(): Promise<ConversationsCapabilities> {
  const mode = await fetchConsoleMode();
  const preview = isPreviewMode(mode);

  if (preview) {
    return {
      dataMode: "preview",
      serverFiltersEnabled: false,
      clientFilterHint: t(defaultLocale, "conversations.mode.previewFilterHint"),
      paginationHint: t(defaultLocale, "conversations.mode.previewPaginationHint"),
    };
  }

  return {
    dataMode: "upstream",
    serverFiltersEnabled: CONVERSATIONS_SERVER_FILTER_ENABLED,
    clientFilterHint: CONVERSATIONS_SERVER_FILTER_ENABLED
      ? t(defaultLocale, "conversations.mode.upstreamFilterReady")
      : t(defaultLocale, "conversations.mode.upstreamFilterHint"),
    paginationHint: t(defaultLocale, "conversations.mode.upstreamPaginationHint"),
  };
}
