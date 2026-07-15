import type { WidgetConfig } from "./types";

export interface PublicWidgetConfig {
  botId: string;
  botName: string;
  welcomeMessage: string;
  recommendedQuestions: string[];
}

export function buildPublicWidgetConfigUrl(config: WidgetConfig, origin: string): string {
  const url = new URL(`${config.apiBase}/public/widget/config`);
  url.searchParams.set("botId", config.botId);
  url.searchParams.set("siteKey", config.siteKey);
  url.searchParams.set("origin", origin);
  return url.toString();
}

export async function fetchPublicWidgetConfig(
  config: WidgetConfig,
  origin = window.location.origin,
): Promise<PublicWidgetConfig> {
  const response = await fetch(buildPublicWidgetConfigUrl(config, origin), {
    method: "GET",
    headers: { accept: "application/json" },
  });

  if (!response.ok) {
    let message = `加载机器人配置失败 (${response.status})`;
    try {
      const payload = (await response.json()) as { message?: string };
      if (payload.message) message = payload.message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }

  return (await response.json()) as PublicWidgetConfig;
}
