"use client";

import { useState } from "react";
import { Globe2, Link2, Tag, UserRound } from "lucide-react";

import { Badge, Button, Input, Label } from "@qiyun/ui";

import { ConversationStatusBadge } from "@/components/conversations/conversation-status-badge";
import { formatShortDateTime } from "@/lib/conversations/format";
import type { ConversationDetail, ConversationStatus } from "@/lib/conversations/types";
import { t } from "@/lib/i18n";
import { defaultLocale } from "@/lib/messages";

export interface ConversationDetailPanelProps {
  conversation: ConversationDetail | null;
  loading?: boolean;
  saving?: boolean;
  onStatusChange: (status: ConversationStatus) => void;
  onTagsChange: (tags: string[]) => void;
}

export function ConversationDetailPanel({
  conversation,
  loading = false,
  saving = false,
  onStatusChange,
  onTagsChange,
}: ConversationDetailPanelProps) {
  const [tagInput, setTagInput] = useState("");

  if (loading) {
    return <div className="p-4 text-sm text-muted-foreground">加载会话详情…</div>;
  }

  if (!conversation) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
        {t(defaultLocale, "conversations.detail.empty")}
      </div>
    );
  }

  function handleAddTag() {
    if (!conversation) return;
    const next = tagInput.trim();
    if (!next || conversation.tags.includes(next)) return;
    onTagsChange([...conversation.tags, next]);
    setTagInput("");
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto p-4">
      <h2 className="text-base font-semibold text-foreground">
        {t(defaultLocale, "conversations.detail.title")}
      </h2>

      <section className="mt-4 space-y-3 rounded-card border border-border bg-card p-4 shadow-sm">
        <h3 className="text-sm font-medium text-card-foreground">会话属性</h3>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">访客</dt>
            <dd className="text-right font-medium">{conversation.visitorLabel}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">访客 ID</dt>
            <dd className="text-right font-mono text-xs">{conversation.visitorId}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">机器人</dt>
            <dd className="text-right">{conversation.botName}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">渠道</dt>
            <dd className="text-right">{conversation.channel}</dd>
          </div>
          <div className="flex items-start justify-between gap-3">
            <dt className="text-muted-foreground">来源页面</dt>
            <dd className="max-w-[60%] break-all text-right text-xs">{conversation.pageUrl}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">创建时间</dt>
            <dd className="text-right">{formatShortDateTime(conversation.createdAt)}</dd>
          </div>
        </dl>
      </section>

      <section className="mt-4 space-y-3 rounded-card border border-border bg-card p-4 shadow-sm">
        <h3 className="text-sm font-medium text-card-foreground">处理状态</h3>
        <div className="flex items-center gap-2">
          <ConversationStatusBadge status={conversation.status} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="conversation-status">更新状态</Label>
          <select
            id="conversation-status"
            className="flex h-10 w-full rounded-control border border-input bg-background px-3 text-sm"
            value={conversation.status}
            disabled={saving}
            onChange={(event) => onStatusChange(event.target.value as ConversationStatus)}
          >
            <option value="open">进行中</option>
            <option value="pending">待处理</option>
            <option value="unresolved">未解决</option>
            <option value="resolved">已解决</option>
          </select>
        </div>
        {conversation.assignee ? (
          <p className="text-sm text-muted-foreground">
            <UserRound className="mr-1 inline h-4 w-4" aria-hidden />
            负责人：{conversation.assignee}
          </p>
        ) : null}
      </section>

      <section className="mt-4 space-y-3 rounded-card border border-border bg-card p-4 shadow-sm">
        <h3 className="inline-flex items-center gap-2 text-sm font-medium text-card-foreground">
          <Tag className="h-4 w-4" aria-hidden />
          标签
        </h3>
        <div className="flex flex-wrap gap-2">
          {conversation.tags.map((tag) => (
            <Badge key={tag} variant="secondary">
              {tag}
            </Badge>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={tagInput}
            onChange={(event) => setTagInput(event.target.value)}
            placeholder="添加标签"
            disabled={saving}
          />
          <Button type="button" variant="outline" onClick={handleAddTag} disabled={saving}>
            添加
          </Button>
        </div>
      </section>

      <section className="mt-4 space-y-3 rounded-card border border-border bg-card p-4 shadow-sm">
        <h3 className="text-sm font-medium text-card-foreground">留资信息</h3>
        {conversation.lead ? (
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">姓名</dt>
              <dd className="text-right font-medium">{conversation.lead.name}</dd>
            </div>
            {conversation.lead.phone ? (
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">手机</dt>
                <dd className="text-right">{conversation.lead.phone}</dd>
              </div>
            ) : null}
            {conversation.lead.email ? (
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">邮箱</dt>
                <dd className="text-right">{conversation.lead.email}</dd>
              </div>
            ) : null}
            {conversation.lead.company ? (
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">公司</dt>
                <dd className="text-right">{conversation.lead.company}</dd>
              </div>
            ) : null}
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">留资时间</dt>
              <dd className="text-right">{formatShortDateTime(conversation.lead.capturedAt)}</dd>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground">该会话暂无留资记录。</p>
        )}
      </section>

      <div className="mt-4 space-y-2 text-xs text-muted-foreground">
        <p className="inline-flex items-center gap-1">
          <Globe2 className="h-3.5 w-3.5" aria-hidden />
          {conversation.channel}
        </p>
        <p className="inline-flex items-center gap-1 break-all">
          <Link2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {conversation.pageUrl}
        </p>
      </div>
    </div>
  );
}
