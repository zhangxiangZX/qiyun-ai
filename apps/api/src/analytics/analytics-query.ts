export interface AnalyticsQuery {
  from?: string;
  to?: string;
  botId?: string;
}

export function parseAnalyticsQuery(
  searchParams: URLSearchParams,
): AnalyticsQuery {
  const from = searchParams.get("from")?.trim() || undefined;
  const to = searchParams.get("to")?.trim() || undefined;
  const botId = searchParams.get("botId")?.trim() || undefined;

  return {
    from: from && /^\d{4}-\d{2}-\d{2}$/.test(from) ? from : undefined,
    to: to && /^\d{4}-\d{2}-\d{2}$/.test(to) ? to : undefined,
    botId: botId || undefined,
  };
}

function parseDayStart(day: string): number {
  return Date.parse(`${day}T00:00:00.000Z`);
}

function parseDayEnd(day: string): number {
  return Date.parse(`${day}T23:59:59.999Z`);
}

export function isWithinAnalyticsRange(
  createdAt: string,
  query: AnalyticsQuery,
): boolean {
  const timestamp = Date.parse(createdAt);
  if (Number.isNaN(timestamp)) {
    return false;
  }

  if (query.from) {
    const fromStart = parseDayStart(query.from);
    if (!Number.isNaN(fromStart) && timestamp < fromStart) {
      return false;
    }
  }

  if (query.to) {
    const toEnd = parseDayEnd(query.to);
    if (!Number.isNaN(toEnd) && timestamp > toEnd) {
      return false;
    }
  }

  return true;
}

export function matchesAnalyticsBot<T extends { botId: string }>(
  item: T,
  query: AnalyticsQuery,
): boolean {
  if (!query.botId) {
    return true;
  }

  return item.botId === query.botId;
}
