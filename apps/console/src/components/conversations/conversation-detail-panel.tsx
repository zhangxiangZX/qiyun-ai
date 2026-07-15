"use client";

import { useMemo, useState } from "react";
import {
  BookOpenText,
  BrainCircuit,
  Globe2,
  Link2,
  Tag,
  UserRound,
} from "lucide-react";

import { Alert, Badge, Button, Input, Label, Select, Skeleton } from "@qiyun/ui";

import { ConversationStatusBadge } from "@/components/conversations/conversation-status-badge";
import {
  KnowledgeCitationList,
  aggregateMessageCitations,
} from "@/components/shared/knowledge-citation-list";
import { formatShortDateTime } from "@/lib/conversations/format";
import type { ConversationDetail, ConversationStatus } from "@/lib/conversations/types";
import { t } from "@/lib/i18n";
import { defaultLocale } from "@/lib/messages";

export interface ConversationDetailPanelProps {
  conversation: ConversationDetail | null;
  loading?: boolean;
  saving?: boolean;
  editingDisabled?: boolean;
  editingDisabledReason?: string;
  metadataNotice?: string | null;
  onStatusChange: (status: ConversationStatus) => void;
  onTagsChange: (tags: string[]) => void;
}

function formatConfidence(value: number | null): string {
  if (value === null || Number.isNaN(value)) {
    return "未提供";
  }

  return `${Math.round(value * 100)}%`;
}

function formatIntent(value: string | null): string {
  switch (value) {
    case "selection":
      return "选型咨询";
    case "parameters":
      return "参数确认";
    case "quote":
      return "报价意向";
    case "delivery":
      return "交期咨询";
    case "customization":
      return "定制需求";
    case "temperature-control":
      return "温控设备";
    case "cabinet":
      return "机柜空调";
    case "console":
      return "控制台";
    case "suspension":
      return "悬臂系统";
    case "accessory":
      return "配件";
    case "general":
      return "通用咨询";
    default:
      return value ?? "未识别";
  }
}

export function ConversationDetailPanel({
  conversation,
  loading = false,
  saving = false,
  editingDisabled = false,
  editingDisabledReason,
  metadataNotice,
  onStatusChange,
  onTagsChange,
}: ConversationDetailPanelProps) {
  const [tagInput, setTagInput] = useState("");

  const aggregatedCitations = useMemo(
    () => (conversation ? aggregateMessageCitations(conversation.messages) : []),
    [conversation],
  );

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-36 rounded-card" />
        <Skeleton className="h-28 rounded-card" />
        <Skeleton className="h-40 rounded-card" />
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
        {t(defaultLocale, "conversations.detail.empty")}
      </div>
    );
  }

  const detail = conversation;

  function handleAddTag() {
    const next = tagInput.trim();
    if (!next || detail.tags.includes(next)) {
      return;
    }
    onTagsChange([...detail.tags, next]);
    setTagInput("");
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto p-4">
      <h2 className="text-base font-semibold text-foreground">
        {t(defaultLocale, "conversations.detail.title")}
      </h2>

      {metadataNotice ? (
        <Alert variant="info" title="状态提示" className="mt-4">
          {metadataNotice}
        </Alert>
      ) : null}

      <section className="mt-4 space-y-3 rounded-card border border-border bg-card p-4 shadow-sm">
        <h3 className="text-sm font-medium text-card-foreground">
          {t(defaultLocale, "conversations.detail.attributes")}
        </h3>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">{t(defaultLocale, "conversations.detail.visitor")}</dt>
            <dd className="text-right font-medium">{conversation.visitorLabel}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">{t(defaultLocale, "conversations.detail.visitorId")}</dt>
            <dd className="text-right font-mono text-xs">{conversation.visitorId}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">{t(defaultLocale, "conversations.detail.bot")}</dt>
            <dd className="text-right">{conversation.botName}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">{t(defaultLocale, "conversations.detail.channel")}</dt>
            <dd className="text-right">{conversation.channel}</dd>
          </div>
          <div className="flex items-start justify-between gap-3">
            <dt className="text-muted-foreground">{t(defaultLocale, "conversations.detail.pageUrl")}</dt>
            <dd className="max-w-[60%] break-all text-right text-xs">{conversation.pageUrl}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">{t(defaultLocale, "conversations.detail.createdAt")}</dt>
            <dd className="text-right">{formatShortDateTime(conversation.createdAt)}</dd>
          </div>
        </dl>
      </section>

      <section className="mt-4 space-y-3 rounded-card border border-border bg-card p-4 shadow-sm">
        <h3 className="text-sm font-medium text-card-foreground">
          {t(defaultLocale, "conversations.detail.statusSection")}
        </h3>
        {editingDisabled ? (
          <p className="text-sm text-muted-foreground">
            {editingDisabledReason ?? t(defaultLocale, "conversations.detail.editDisabledDefault")}
          </p>
        ) : null}
        <div className="flex items-center gap-2">
          <ConversationStatusBadge status={conversation.status} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="conversation-status">{t(defaultLocale, "conversations.detail.statusLabel")}</Label>
          <Select
            id="conversation-status"
            value={conversation.status}
            disabled={saving || editingDisabled}
            onChange={(event) => onStatusChange(event.target.value as ConversationStatus)}
          >
            <option value="open">{t(defaultLocale, "conversations.status.open")}</option>
            <option value="pending">{t(defaultLocale, "conversations.status.pending")}</option>
            <option value="unresolved">{t(defaultLocale, "conversations.status.unresolved")}</option>
            <option value="resolved">{t(defaultLocale, "conversations.status.resolved")}</option>
          </Select>
        </div>
        {conversation.assignee ? (
          <p className="text-sm text-muted-foreground">
            <UserRound className="mr-1 inline h-4 w-4" aria-hidden />
            {t(defaultLocale, "conversations.detail.assignee")}：{conversation.assignee}
          </p>
        ) : null}
      </section>

      <section className="mt-4 space-y-3 rounded-card border border-border bg-card p-4 shadow-sm">
        <h3 className="inline-flex items-center gap-2 text-sm font-medium text-card-foreground">
          <BrainCircuit className="h-4 w-4" aria-hidden />
          AI 判断
        </h3>
        {conversation.aiInsight ? (
          <>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">咨询意图</dt>
                <dd className="text-right">{formatIntent(conversation.aiInsight.intent)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">产品线</dt>
                <dd className="text-right">{formatIntent(conversation.aiInsight.productLine)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">判断置信度</dt>
                <dd className="text-right">{formatConfidence(conversation.aiInsight.confidence)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">建议留资</dt>
                <dd className="text-right">
                  {conversation.aiInsight.leadCaptureRecommended ? "是" : "否"}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">连续高意向轮次</dt>
                <dd className="text-right">{conversation.aiInsight.highIntentTurnCount}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">最近评估时间</dt>
                <dd className="text-right">
                  {conversation.aiInsight.lastEvaluatedAt
                    ? formatShortDateTime(conversation.aiInsight.lastEvaluatedAt)
                    : "未记录"}
                </dd>
              </div>
            </dl>

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">待补充信息</p>
              <div className="flex flex-wrap gap-2">
                {conversation.aiInsight.missingFields.length > 0 ? (
                  conversation.aiInsight.missingFields.map((field) => (
                    <Badge key={field} variant="secondary">
                      {field}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">当前没有缺失字段提示</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">建议继续追问</p>
              <div className="flex flex-wrap gap-2">
                {conversation.aiInsight.suggestedQuestions.length > 0 ? (
                  conversation.aiInsight.suggestedQuestions.map((question) => (
                    <Badge key={question} variant="outline">
                      {question}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">暂无推荐追问</p>
                )}
              </div>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            当前会话还没有生成 AI 判断信息。
          </p>
        )}
      </section>

      <section className="mt-4 space-y-3 rounded-card border border-border bg-card p-4 shadow-sm">
        <h3 className="inline-flex items-center gap-2 text-sm font-medium text-card-foreground">
          <Tag className="h-4 w-4" aria-hidden />
          {t(defaultLocale, "conversations.detail.tags")}
        </h3>
        <div className="flex flex-wrap gap-2">
          {conversation.tags.length ? (
            conversation.tags.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">暂无标签</p>
          )}
        </div>
        <div className="flex gap-2">
          <Input
            value={tagInput}
            onChange={(event) => setTagInput(event.target.value)}
            placeholder={t(defaultLocale, "conversations.detail.tagPlaceholder")}
            disabled={saving || editingDisabled}
          />
          <Button
            type="button"
            variant="outline"
            onClick={handleAddTag}
            disabled={saving || editingDisabled || !tagInput.trim()}
          >
            {t(defaultLocale, "conversations.detail.tagAdd")}
          </Button>
        </div>
      </section>

      <section className="mt-4 space-y-3 rounded-card border border-border bg-card p-4 shadow-sm">
        <h3 className="inline-flex items-center gap-2 text-sm font-medium text-card-foreground">
          <BookOpenText className="h-4 w-4" aria-hidden />
          知识引用
        </h3>
        <p className="text-sm text-muted-foreground">
          汇总本次会话中命中的知识库片段，方便复核回答依据。
        </p>
        <KnowledgeCitationList citations={aggregatedCitations} />
      </section>

      <section className="mt-4 space-y-3 rounded-card border border-border bg-card p-4 shadow-sm">
        <h3 className="text-sm font-medium text-card-foreground">
          {t(defaultLocale, "conversations.detail.leadSection")}
        </h3>
        {conversation.lead ? (
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">{t(defaultLocale, "conversations.detail.leadName")}</dt>
              <dd className="text-right font-medium">{conversation.lead.name}</dd>
            </div>
            {conversation.lead.phone ? (
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">{t(defaultLocale, "conversations.detail.leadPhone")}</dt>
                <dd className="text-right">{conversation.lead.phone}</dd>
              </div>
            ) : null}
            {conversation.lead.email ? (
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">{t(defaultLocale, "conversations.detail.leadEmail")}</dt>
                <dd className="text-right">{conversation.lead.email}</dd>
              </div>
            ) : null}
            {conversation.lead.company ? (
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">{t(defaultLocale, "conversations.detail.leadCompany")}</dt>
                <dd className="text-right">{conversation.lead.company}</dd>
              </div>
            ) : null}
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">{t(defaultLocale, "conversations.detail.leadCapturedAt")}</dt>
              <dd className="text-right">{formatShortDateTime(conversation.lead.capturedAt)}</dd>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground">
            {t(defaultLocale, "conversations.detail.leadEmpty")}
          </p>
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
