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
