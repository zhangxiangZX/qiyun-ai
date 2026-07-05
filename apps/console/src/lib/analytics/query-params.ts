export interface AnalyticsQueryParams {
  from?: string;
  to?: string;
  botId?: string;
}

export function buildAnalyticsRequestPath(
  path: string,
  query: AnalyticsQueryParams = {},
): string {
  const searchParams = new URLSearchParams();
  if (query.from) {
    searchParams.set("from", query.from);
  }
  if (query.to) {
    searchParams.set("to", query.to);
  }
  if (query.botId) {
    searchParams.set("botId", query.botId);
  }
  const suffix = searchParams.toString();
  return `${path}${suffix ? `?${suffix}` : ""}`;
}
