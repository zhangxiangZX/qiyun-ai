import type { ApiRuntime } from "../runtime";
import type { RequestContext } from "../workspace";
import type {
  MarkNotificationsReadInput,
  MarkNotificationsReadResult,
  NotificationFeed,
  NotificationItem,
  NotificationKind,
} from "./notification.types";
import type { NotificationReadRepository } from "./notification-read.repository";

function toTimeLabel(value: string): string {
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) {
    return value;
  }

  const diffMs = Date.now() - timestamp;
  const diffMinutes = Math.max(1, Math.floor(diffMs / (60 * 1000)));
  if (diffMinutes < 60) {
    return `${diffMinutes} 分钟前`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} 小时前`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return `${diffDays} 天前`;
  }

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).format(new Date(value));
}

function isRecent(value: string, hours = 48): boolean {
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) {
    return false;
  }
  return Date.now() - timestamp <= hours * 60 * 60 * 1000;
}

function applyReadState(
  items: NotificationItem[],
  readIds: Set<string>,
): NotificationFeed {
  const normalizedItems = items.map((item) => ({
    ...item,
    unread: item.unread && !readIds.has(item.id),
  }));

  return {
    items: normalizedItems,
    unreadCount: normalizedItems.filter((item) => item.unread).length,
  };
}

export class NotificationService {
  constructor(
    private readonly runtime: ApiRuntime,
    private readonly readRepository: NotificationReadRepository,
  ) {}

  async getFeed(context: RequestContext): Promise<NotificationFeed> {
    const items = await this.buildNotifications(context);
    const readIds = await this.readRepository.listReadIds(context.workspaceId, context.userId);
    return applyReadState(items, readIds);
  }

  async markRead(
    context: RequestContext,
    input: MarkNotificationsReadInput,
  ): Promise<MarkNotificationsReadResult> {
    const feed = await this.getFeed(context);
    const allIds = feed.items.map((item) => item.id);
    const markAll = input.all === true;
    const requestedIds = Array.isArray(input.ids)
      ? input.ids.filter((id) => typeof id === "string" && id.trim())
      : [];

    const markedIds = markAll ? allIds : requestedIds;

    if (!markAll && !markedIds.length) {
      throw new NotificationValidationError("Provide ids or set all to true.");
    }

    await this.readRepository.markRead(context.workspaceId, context.userId, markedIds);
    const readIds = await this.readRepository.listReadIds(context.workspaceId, context.userId);
    const nextFeed = applyReadState(await this.buildNotifications(context), readIds);

    return {
      ok: true,
      markedIds,
      unreadCount: nextFeed.unreadCount,
    };
  }

  private async buildNotifications(context: RequestContext): Promise<NotificationItem[]> {
    const items: NotificationItem[] = [];

    const leads = await this.runtime.publicChatApi.listLeads(context);
    for (const lead of leads.slice(0, 6)) {
      if (lead.status !== "new" && lead.status !== "pending") {
        continue;
      }
      items.push({
        id: `lead:${lead.id}`,
        title: "有新的线索等待跟进",
        body: `${lead.name} · ${lead.sourceBot}`,
        createdAt: lead.createdAt,
        timeLabel: toTimeLabel(lead.createdAt),
        href: `/dashboard/leads?highlight=${encodeURIComponent(lead.id)}`,
        unread: isRecent(lead.createdAt),
        kind: "lead",
      });
    }

    const knowledgeBases = await this.runtime.documentApi.listKnowledgeBases(context);
    for (const kb of knowledgeBases.slice(0, 6)) {
      const documents = await this.runtime.documentApi.listKnowledgeBaseDocuments(
        context,
        kb.id,
      );
      for (const document of documents) {
        if (document.status !== "failed") {
          continue;
        }
        items.push({
          id: `document:${document.id}`,
          title: "文档处理失败",
          body: `${document.fileName} · ${kb.name}`,
          createdAt: document.updatedAt,
          timeLabel: toTimeLabel(document.updatedAt),
          href: `/dashboard/knowledge-bases?highlight=${encodeURIComponent(kb.id)}&doc=${encodeURIComponent(document.id)}`,
          unread: isRecent(document.updatedAt),
          kind: "document",
        });
      }
    }

    if (context.role === "owner" || context.role === "admin") {
      const invitations = await this.runtime.authApi.listWorkspaceInvitations(context);
      for (const invitation of invitations.slice(0, 6)) {
        const audits = await this.runtime.authApi.listWorkspaceInvitationDeliveryAudits(
          context,
          invitation.id,
        );
        const latestFailed = [...audits]
          .filter((audit) => audit.status === "failed")
          .sort((left, right) => right.finishedAt.localeCompare(left.finishedAt))[0];
        if (!latestFailed) {
          continue;
        }
        items.push({
          id: `invite-audit:${latestFailed.id}`,
          title: "成员邀请发送失败",
          body: latestFailed.errorMessage
            ? `${invitation.email} · ${latestFailed.errorMessage}`
            : invitation.email,
          createdAt: latestFailed.finishedAt,
          timeLabel: toTimeLabel(latestFailed.finishedAt),
          href: `/dashboard/team?highlight=${encodeURIComponent(invitation.id)}`,
          unread: isRecent(latestFailed.finishedAt),
          kind: "invite",
        });
      }
    }

    const conversations = await this.runtime.publicChatApi.listConversations(context, {
      limit: 40,
    });
    for (const conversation of conversations.items) {
      if (!conversation.highIntent || !isRecent(conversation.updatedAt)) {
        continue;
      }
      const intentSuffix = conversation.aiIntentLabel
        ? ` · ${conversation.aiIntentLabel}`
        : "";
      items.push({
        id: `conversation:${conversation.id}`,
        title: "新的高意向会话",
        body: `${conversation.visitorLabel}${intentSuffix}`,
        createdAt: conversation.updatedAt,
        timeLabel: toTimeLabel(conversation.updatedAt),
        href: `/dashboard/conversations?highlight=${encodeURIComponent(conversation.id)}`,
        unread: isRecent(conversation.updatedAt),
        kind: "conversation",
      });
    }

    return items
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .slice(0, 20);
  }
}

export class NotificationValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotificationValidationError";
  }
}

export function isNotificationKind(value: string): value is NotificationKind {
  return (
    value === "lead"
    || value === "conversation"
    || value === "system"
    || value === "document"
    || value === "invite"
  );
}
