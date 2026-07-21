"use client";

import Link from "next/link";
import { CheckCircle2, PanelRightOpen, Sparkles } from "lucide-react";

import { Badge, Button, Label, Select } from "@qiyun/ui";

import { ConversationStatusBadge } from "@/components/conversations/conversation-status-badge";
import type {
  ConversationDetail,
  ConversationListItem,
  ConversationStatus,
} from "@/lib/conversations/types";
import { t } from "@/lib/i18n";
import { defaultLocale } from "@/lib/messages";

export interface ConversationFollowUpBarProps {
  listItem: ConversationListItem;
  detail: ConversationDetail | null;
  highlightMode?: boolean;
  saving?: boolean;
  editingDisabled?: boolean;
  onStatusChange: (status: ConversationStatus) => void;
  onOpenDetail: () => void;
}

export function ConversationFollowUpBar({
  listItem,
  detail,
  highlightMode = false,
  saving = false,
  editingDisabled = false,
  onStatusChange,
  onOpenDetail,
}: ConversationFollowUpBarProps) {
  const status = detail?.status ?? listItem.status;
  const showHighIntent = listItem.highIntent || highlightMode;
  const intentLabel = listItem.aiIntentLabel ?? detail?.aiInsight?.intent ?? null;

  return (
    <div
      className={
        highlightMode
          ? "border-b border-warning/40 bg-warning/10 px-4 py-3"
          : "border-b border-border bg-muted/30 px-4 py-3"
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        {showHighIntent ? (
          <Badge variant="warning" className="gap-1">
            <Sparkles className="h-3 w-3" aria-hidden />
            {intentLabel ? `高意向 · ${intentLabel}` : "高意向会话"}
          </Badge>
        ) : null}
        <ConversationStatusBadge status={status} />
        {listItem.hasLead ? <Badge variant="info">已留资</Badge> : null}
        {highlightMode ? (
          <span className="text-xs text-muted-foreground">来自通知提醒，请尽快跟进</span>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap items-end gap-3">
        <div className="min-w-[10rem] flex-1 space-y-1">
          <Label htmlFor="follow-up-status" className="text-xs">
            {t(defaultLocale, "conversations.detail.statusLabel")}
          </Label>
          <Select
            id="follow-up-status"
            value={status}
            disabled={saving || editingDisabled}
            onChange={(event) => onStatusChange(event.target.value as ConversationStatus)}
          >
            <option value="open">{t(defaultLocale, "conversations.status.open")}</option>
            <option value="pending">{t(defaultLocale, "conversations.status.pending")}</option>
            <option value="unresolved">{t(defaultLocale, "conversations.status.unresolved")}</option>
            <option value="resolved">{t(defaultLocale, "conversations.status.resolved")}</option>
          </Select>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-11"
          disabled={saving || editingDisabled || status === "resolved"}
          onClick={() => onStatusChange("resolved")}
        >
          <CheckCircle2 className="h-4 w-4" aria-hidden />
          标记已解决
        </Button>

        {listItem.hasLead ? (
          <Button type="button" variant="outline" size="sm" className="min-h-11" asChild>
            <Link href="/dashboard/inquiries">查看询盘</Link>
          </Button>
        ) : null}

        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="min-h-11 lg:hidden"
          onClick={onOpenDetail}
        >
          <PanelRightOpen className="h-4 w-4" aria-hidden />
          更多详情
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="hidden min-h-11 lg:inline-flex"
          onClick={onOpenDetail}
        >
          <PanelRightOpen className="h-4 w-4" aria-hidden />
          查看详情面板
        </Button>
      </div>
    </div>
  );
}
