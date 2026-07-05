import type { BotListItem } from "@/lib/bots/types";
import type { AnalyticsQueryParams } from "@/lib/analytics/query-params";
import {
  buildDateRangeOptions,
  buildOverviewRobots,
  parseDateRangeSelection,
} from "@/lib/dashboard/overview-display";

export function buildAnalyticsQuery(input: {
  dateRange: string;
  robotFilter: string;
  bots: BotListItem[];
}): AnalyticsQueryParams {
  const range = parseDateRangeSelection(input.dateRange);
  const botId =
    input.robotFilter === "全部机器人"
      ? undefined
      : input.bots.find((bot) => bot.name === input.robotFilter)?.id;

  return {
    from: range.from,
    to: range.to,
    botId,
  };
}

export function buildAnalyticsFilterOptions(bots: BotListItem[]) {
  const names = buildOverviewRobots(bots).map((row) => row.name);
  return {
    dateRangeOptions: buildDateRangeOptions(),
    robotOptions: ["全部机器人", ...names],
  };
}

export function defaultAnalyticsDateRange(): string {
  return buildDateRangeOptions()[0] ?? "";
}
