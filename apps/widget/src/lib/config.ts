import type { WidgetConfig } from "./types";

const THEME_ACCENTS: Record<string, string> = {
  blue: "#1f64eb",
  green: "#059669",
  dark: "#111827",
};

export function resolveApiBase(script: HTMLScriptElement): string {
  const explicit = script.getAttribute("data-api-base")?.replace(/\/$/, "");
  if (explicit) return explicit;
  try {
    return new URL(script.src).origin;
  } catch {
    return "";
  }
}

export function parseWidgetConfig(script: HTMLScriptElement): WidgetConfig | null {
  const botId = script.getAttribute("data-bot-id")?.trim() ?? "";
  const siteKey = script.getAttribute("data-site-key")?.trim() ?? "";
  const apiBase = resolveApiBase(script);

  if (!botId || !siteKey || !apiBase) {
    return null;
  }

  const theme = script.getAttribute("data-theme") ?? "blue";
  const localeAttr = script.getAttribute("data-locale");
  const locale = localeAttr === "en" ? "en" : "zh-CN";

  return {
    botId,
    siteKey,
    apiBase,
    title: script.getAttribute("data-title") ?? (locale === "en" ? "AI Assistant" : "企云 AI 客服助手"),
    welcome:
      script.getAttribute("data-welcome") ??
      (locale === "en"
        ? "Hello! I'm your Qiyun AI assistant, glad to help you."
        : "您好！我是企云 AI 客服助手，很高兴为您服务！"),
    accent: THEME_ACCENTS[theme] ?? THEME_ACCENTS.blue,
    locale,
  };
}

export function validateWidgetConfig(config: WidgetConfig | null): config is WidgetConfig {
  return Boolean(config?.botId && config.siteKey && config.apiBase);
}
