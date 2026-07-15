"use client";

import { Search } from "lucide-react";

import { Button, Input, Label } from "@qiyun/ui";

import type { BotFilterOption, ConversationFilters } from "@/lib/conversations/types";
import { t } from "@/lib/i18n";
import { defaultLocale } from "@/lib/messages";

export interface ConversationFiltersBarProps {
  filters: ConversationFilters;
  botOptions: BotFilterOption[];
  onChange: (patch: Partial<ConversationFilters>) => void;
  hasActiveFilters?: boolean;
  onReset?: () => void;
  filterHint?: string;
}

export function ConversationFiltersBar({
  filters,
  botOptions,
  onChange,
  hasActiveFilters = false,
  onReset,
  filterHint,
}: ConversationFiltersBarProps) {
  return (
    <div className="space-y-3 border-b border-border p-4">
      {hasActiveFilters && onReset ? (
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">已启用筛选条件</p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="min-h-11 shrink-0"
            onClick={onReset}
          >
            {t(defaultLocale, "conversations.filters.reset")}
          </Button>
        </div>
      ) : null}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={filters.query}
          onChange={(event) => onChange({ query: event.target.value })}
          placeholder={t(defaultLocale, "conversations.filters.search")}
          className="pl-9"
          aria-label={t(defaultLocale, "conversations.filters.search")}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="bot-filter">{t(defaultLocale, "conversations.filters.bot")}</Label>
        <select
          id="bot-filter"
          className="flex min-h-11 w-full rounded-control border border-input bg-background px-3 text-sm"
          value={filters.botId}
          onChange={(event) => onChange({ botId: event.target.value })}
        >
          <option value="all">{t(defaultLocale, "conversations.filters.allBots")}</option>
          {botOptions.map((bot) => (
            <option key={bot.id} value={bot.id}>
              {bot.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-input"
            checked={filters.hasLead === true}
            onChange={(event) => onChange({ hasLead: event.target.checked ? true : null })}
          />
          <span>{t(defaultLocale, "conversations.filters.hasLead")}</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-input"
            checked={filters.unresolvedOnly}
            onChange={(event) => onChange({ unresolvedOnly: event.target.checked })}
          />
          <span>{t(defaultLocale, "conversations.filters.unresolvedOnly")}</span>
        </label>
      </div>
      {filterHint ? (
        <p className="text-xs leading-relaxed text-muted-foreground">{filterHint}</p>
      ) : null}
    </div>
  );
}
