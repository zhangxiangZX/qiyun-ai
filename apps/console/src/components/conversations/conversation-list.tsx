"use client";

import { UserRound } from "lucide-react";

import { Badge, cn } from "@qiyun/ui";

import { ConversationStatusBadge } from "@/components/conversations/conversation-status-badge";
import { formatRelativeTime } from "@/lib/conversations/format";
import type { ConversationListItem } from "@/lib/conversations/types";

export interface ConversationListProps {
  items: ConversationListItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function ConversationList({ items, selectedId, onSelect }: ConversationListProps) {
  if (!items.length) {
    return (
      <div className="p-6 text-center text-sm text-muted-foreground">
        没有匹配的会话
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {items.map((item) => {
        const active = item.id === selectedId;
        return (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onSelect(item.id)}
              className={cn(
                "w-full px-4 py-3 text-left transition-colors hover:bg-accent/50",
                active && "bg-accent",
              )}
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
                {item.hasLead ? <Badge variant="info">已留资</Badge> : null}
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
