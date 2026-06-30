import { apiRequest } from "@/lib/api/client";

export type ConsoleDataMode = "upstream" | "preview";

export interface ConsoleModeInfo {
  mode: ConsoleDataMode;
  upstreamConfigured: boolean;
  message: string;
}

export async function fetchConsoleMode(): Promise<ConsoleModeInfo> {
  return apiRequest<ConsoleModeInfo>("/console/mode");
}

export function isPreviewMode(info: ConsoleModeInfo): boolean {
  return info.mode === "preview";
}

export function isUpstreamMode(info: ConsoleModeInfo): boolean {
  return info.mode === "upstream";
}
