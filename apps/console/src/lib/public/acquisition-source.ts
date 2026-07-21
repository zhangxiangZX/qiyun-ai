/** Canonical WeChat Official Account acquisition source for public pages. */
export const WECHAT_OFFICIAL_ACCOUNT_SOURCE = "wechat_official_account";

const SOURCE_ALIASES: Record<string, string> = {
  wechat: WECHAT_OFFICIAL_ACCOUNT_SOURCE,
  weixin: WECHAT_OFFICIAL_ACCOUNT_SOURCE,
  wx: WECHAT_OFFICIAL_ACCOUNT_SOURCE,
  mp: WECHAT_OFFICIAL_ACCOUNT_SOURCE,
  official_account: WECHAT_OFFICIAL_ACCOUNT_SOURCE,
  wechat_oa: WECHAT_OFFICIAL_ACCOUNT_SOURCE,
};

/** Query keys that may carry acquisition source on public URLs. */
export const ACQUISITION_SOURCE_QUERY_KEYS = ["source", "src", "ch", "ref"] as const;

/**
 * Read and normalize an acquisition source from URLSearchParams / query object.
 * Supports `source=wechat_official_account` and common WeChat aliases.
 */
export function resolveAcquisitionSource(
  search:
    | URLSearchParams
    | Record<string, string | string[] | undefined>
    | null
    | undefined,
): string {
  if (!search) return "";

  const read = (key: string): string => {
    if (search instanceof URLSearchParams) {
      return (search.get(key) ?? "").trim();
    }
    const raw = search[key];
    if (Array.isArray(raw)) return (raw[0] ?? "").trim();
    return (raw ?? "").trim();
  };

  for (const key of ACQUISITION_SOURCE_QUERY_KEYS) {
    const value = read(key);
    if (!value) continue;
    const lower = value.toLowerCase();
    return SOURCE_ALIASES[lower] ?? value;
  }
  return "";
}

/** Append or replace `source` on a URL string (absolute or relative). */
export function appendAcquisitionSource(url: string, source: string): string {
  const trimmed = source.trim();
  if (!trimmed) return url;
  try {
    const base =
      typeof window !== "undefined" ? window.location.origin : "http://localhost";
    const parsed = new URL(url, base);
    parsed.searchParams.set("source", trimmed);
    if (/^https?:\/\//i.test(url)) return parsed.toString();
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    const joiner = url.includes("?") ? "&" : "?";
    return `${url}${joiner}source=${encodeURIComponent(trimmed)}`;
  }
}

/** Human-readable label for settings tips / footer chips. */
export function formatAcquisitionSourceLabel(source: string): string {
  if (source === WECHAT_OFFICIAL_ACCOUNT_SOURCE) return "微信公众号";
  if (!source) return "";
  return source;
}
