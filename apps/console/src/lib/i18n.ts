import { defaultLocale, messages, type Locale } from "./messages";

type MessageTree = (typeof messages)[Locale];

function resolvePath(source: MessageTree, path: string) {
  return path.split(".").reduce<unknown>((value, segment) => {
    if (value && typeof value === "object" && segment in value) {
      return (value as Record<string, unknown>)[segment];
    }
    return undefined;
  }, source);
}

export function t(locale: Locale, path: string): string {
  const localized = resolvePath(messages[locale], path);
  if (typeof localized === "string") {
    return localized;
  }

  const fallback = resolvePath(messages[defaultLocale], path);
  return typeof fallback === "string" ? fallback : path;
}

export function isLocale(value: string): value is Locale {
  return value === "zh-CN" || value === "en-US";
}
