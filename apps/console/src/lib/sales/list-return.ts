/**
 * Preserve list filters when navigating list ↔ detail via `returnTo` search param.
 * `returnTo` stores the list path + query (must start with /dashboard/).
 */

const ALLOWED_PREFIX = "/dashboard/";

export function buildReturnToParam(listHref: string): string {
  return listHref.startsWith(ALLOWED_PREFIX) ? listHref : ALLOWED_PREFIX;
}

export function withReturnTo(detailPath: string, listHref: string): string {
  if (!listHref || listHref === detailPath) return detailPath;
  const params = new URLSearchParams();
  params.set("returnTo", buildReturnToParam(listHref));
  const joiner = detailPath.includes("?") ? "&" : "?";
  return `${detailPath}${joiner}${params.toString()}`;
}

export function resolveReturnTo(
  returnTo: string | null | undefined,
  fallback: string,
): string {
  if (!returnTo) return fallback;
  try {
    const decoded = decodeURIComponent(returnTo);
    if (decoded.startsWith(ALLOWED_PREFIX) && !decoded.startsWith("//")) {
      return decoded;
    }
  } catch {
    /* ignore */
  }
  return fallback;
}

export function buildInquiryListHref(input: {
  tab?: string;
  q?: string;
  intent?: string;
  status?: string;
  from?: string;
  to?: string;
}): string {
  const params = new URLSearchParams();
  if (input.tab && input.tab !== "all") params.set("tab", input.tab);
  if (input.q?.trim()) params.set("q", input.q.trim());
  if (input.intent && input.intent !== "all") params.set("intent", input.intent);
  if (input.status && input.status !== "all") params.set("status", input.status);
  if (input.from) params.set("from", input.from);
  if (input.to) params.set("to", input.to);
  const qs = params.toString();
  return qs ? `/dashboard/inquiries?${qs}` : "/dashboard/inquiries";
}

export function buildQuoteListHref(input: {
  status?: string;
  q?: string;
}): string {
  const params = new URLSearchParams();
  if (input.status && input.status !== "all") params.set("status", input.status);
  if (input.q?.trim()) params.set("q", input.q.trim());
  const qs = params.toString();
  return qs ? `/dashboard/quotes?${qs}` : "/dashboard/quotes";
}
