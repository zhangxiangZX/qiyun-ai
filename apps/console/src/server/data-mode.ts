import { getUpstreamApiBaseUrl } from "@/server/api-config";

export type ConsoleDataMode = "upstream" | "preview";

export function getConsoleDataMode(): ConsoleDataMode {
  return getUpstreamApiBaseUrl() ? "upstream" : "preview";
}

export function isPreviewDataMode(): boolean {
  return getConsoleDataMode() === "preview";
}

export function isUpstreamDataMode(): boolean {
  return getConsoleDataMode() === "upstream";
}

export function getConsoleModeMessage(): string {
  if (isUpstreamDataMode()) {
    return "Connected to upstream API (apps/api) via BFF proxy.";
  }

  return "Preview mode: Console in-memory BFF only. Set API_BASE_URL to connect apps/api.";
}
