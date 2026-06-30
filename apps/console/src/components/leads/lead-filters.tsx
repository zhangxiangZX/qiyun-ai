"use client";

import { Search } from "lucide-react";

import { Input, Label } from "@qiyun/ui";

import type { BotFilterOption, LeadFilters, LeadStatus } from "@/lib/leads/types";
import { t } from "@/lib/i18n";
import { defaultLocale } from "@/lib/messages";

export interface LeadFiltersBarProps {
  filters: LeadFilters;
  botOptions: BotFilterOption[];
  assigneeOptions: string[];
  onChange: (patch: Partial<LeadFilters>) => void;
}

const statusOptions: Array<{ value: LeadStatus | "all"; label: string }> = [
  { value: "all", label: "全部状态" },
  { value: "new", label: "新建" },
  { value: "following", label: "跟进中" },
  { value: "won", label: "已成交" },
  { value: "invalid", label: "无效" },
];

export function LeadFiltersBar({
  filters,
  botOptions,
  assigneeOptions,
  onChange,
}: LeadFiltersBarProps) {
  return (
    <div className="grid gap-3 rounded-card border border-border bg-card p-4 shadow-card md:grid-cols-2 xl:grid-cols-4">
      <div className="relative md:col-span-2 xl:col-span-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={filters.query}
          onChange={(event) => onChange({ query: event.target.value })}
          placeholder={t(defaultLocale, "leads.filters.search")}
          className="pl-9"
          aria-label={t(defaultLocale, "leads.filters.search")}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="lead-status-filter">{t(defaultLocale, "leads.filters.status")}</Label>
        <select
          id="lead-status-filter"
          className="flex h-10 w-full rounded-control border border-input bg-background px-3 text-sm"
          value={filters.status}
          onChange={(event) => onChange({ status: event.target.value as LeadFilters["status"] })}
        >
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="lead-bot-filter">{t(defaultLocale, "leads.filters.bot")}</Label>
        <select
          id="lead-bot-filter"
          className="flex h-10 w-full rounded-control border border-input bg-background px-3 text-sm"
          value={filters.botId}
          onChange={(event) => onChange({ botId: event.target.value })}
        >
          <option value="all">{t(defaultLocale, "leads.filters.allBots")}</option>
          {botOptions.map((bot) => (
            <option key={bot.id} value={bot.id}>
              {bot.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="lead-assignee-filter">{t(defaultLocale, "leads.filters.assignee")}</Label>
        <select
          id="lead-assignee-filter"
          className="flex h-10 w-full rounded-control border border-input bg-background px-3 text-sm"
          value={filters.assignee}
          onChange={(event) => onChange({ assignee: event.target.value })}
        >
          <option value="all">{t(defaultLocale, "leads.filters.allAssignees")}</option>
          <option value="unassigned">{t(defaultLocale, "leads.filters.unassigned")}</option>
          {assigneeOptions.map((assignee) => (
            <option key={assignee} value={assignee}>
              {assignee}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
