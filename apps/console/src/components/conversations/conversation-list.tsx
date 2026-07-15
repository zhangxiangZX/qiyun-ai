"use client";

import { UserRound } from "lucide-react";

import { Badge, cn } from "@qiyun/ui";

import { ConsoleEmptyState } from "@/components/console/console-empty-catalog";
import { ConversationStatusBadge } from "@/components/conversations/conversation-status-badge";
import { formatRelativeTime } from "@/lib/conversations/format";
import type { ConversationListItem } from "@/lib/conversations/types";

export interface ConversationListProps {
  items: ConversationListItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  filteredEmpty?: boolean;
  onResetFilters?: () => void;
  pinnedItem?: ConversationListItem | null;
  pinnedLabel?: string;
}

export function ConversationList({
  items,
  selectedId,
  onSelect,
  selectedIds,
  onToggleSelect,
  filteredEmpty = false,
  onResetFilters,
  pinnedItem = null,
  pinnedLabel = "当前选中（未在筛选结果中）",
}: ConversationListProps) {
  if (!items.length && !pinnedItem) {
    return (
      <div className="p-4">
        <ConsoleEmptyState
          preset="noMatches"
          actionLabel={filteredEmpty ? "重置筛选" : undefined}
          onAction={filteredEmpty ? onResetFilters : undefined}
        />
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {pinnedItem ? (
        <li className="border-b border-dashed border-border">
          <p className="bg-muted/30 px-4 py-2 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            {pinnedLabel}
          </p>
          <ConversationListRow
            item={pinnedItem}
            active
            pinned
            selected={selectedIds?.has(pinnedItem.id) ?? false}
            onToggle={onToggleSelect}
            onSelect={onSelect}
          />
        </li>
      ) : null}
      {items.map((item) => (
        <li key={item.id}>
          <ConversationListRow
            item={item}
            active={item.id === selectedId}
            selected={selectedIds?.has(item.id) ?? false}
            onToggle={onToggleSelect}
            onSelect={onSelect}
          />
        </li>
      ))}
    </ul>
  );
}

function ConversationListRow({
  item,
  active,
  pinned = false,
  selected = false,
  onToggle,
  onSelect,
}: {
  item: ConversationListItem;
  active: boolean;
  pinned?: boolean;
  selected?: boolean;
  onToggle?: (id: string) => void;
  onSelect: (id: string) => void;
}) {
  const needsAttention = item.status === "unresolved" || item.status === "pending";

  return (
    <div
      id={`conversation-row-${item.id}`}
      className={cn(
        "flex min-h-11 w-full items-stretch border-l-4 transition-colors",
        active && "bg-accent",
        pinned && "border-dashed",
        needsAttention ? "border-l-warning bg-warning/5" : "border-l-transparent",
      )}
    >
      {onToggle ? (
        <label
          className="flex shrink-0 cursor-pointer items-center px-3"
          onClick={(event) => event.stopPropagation()}
        >
          <input
            type="checkbox"
            className="h-4 w-4 accent-[var(--primary)]"
            checked={selected}
            onChange={() => onToggle(item.id)}
            aria-label={`选择会话 ${item.visitorLabel}`}
          />
        </label>
      ) : null}
      <div
        role="button"
        tabIndex={0}
        onClick={() => onSelect(item.id)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onSelect(item.id);
          }
        }}
        className="min-w-0 flex-1 cursor-pointer py-3 pr-4 text-left transition-colors hover:bg-accent/50"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <UserRound className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <span className="truncate text-sm font-medium text-foreground">
              {item.visitorLabel}
            </span>
          </div>
          <span className="shrink-0 text-xs text-muted-foreground">
            {formatRelativeTime(item.updatedAt)}
          </span>
        </div>
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.summary}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <ConversationStatusBadge status={item.status} />
          <Badge variant="outline">{item.botName}</Badge>
          {item.highIntent ? (
            <Badge variant="warning">
              {item.aiIntentLabel ? `高意向 · ${item.aiIntentLabel}` : "高意向"}
            </Badge>
          ) : null}
          {item.hasLead ? <Badge variant="info">已留资</Badge> : null}
        </div>
      </div>
    </div>
  );
}
