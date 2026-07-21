import type { NextRequest } from "next/server";

import { getNotificationPreviewHint } from "@/lib/console/data-mode-hints";
import { normalizeNotificationFeed, type NormalizedNotificationFeed } from "@/lib/notifications/normalize";
import {
  applyNotificationReadState,
  readNotificationReadIds,
  resolveNotificationReadScope,
} from "@/lib/notifications/read-state";
import { getAuthAccessToken, getConsoleAuthApiBaseUrl } from "@/server/auth-session";

const previewNotifications = normalizeNotificationFeed(
  {
    items: [
      {
        id: "n-lead-1",
        title: "有新的线索等待跟进",
        body: "华东制造 · 工业冷水机报价需求",
        timeLabel: "10 分钟前",
        href: "/dashboard/inquiries",
        unread: true,
        kind: "lead",
      },
      {
        id: "n-doc-1",
        title: "文档索引失败",
        body: "产品资料库 · 冷水机选型手册.pdf 解析超时",
        timeLabel: "30 分钟前",
        href: "/dashboard/knowledge-bases",
        unread: true,
        kind: "document",
      },
      {
        id: "n-invite-1",
        title: "成员邀请发送失败",
        body: "chen@example.com 邮箱被服务商拒收",
        timeLabel: "2 小时前",
        href: "/dashboard/team",
        unread: true,
        kind: "invite",
      },
      {
        id: "n-chat-1",
        title: "未解决问题需要补资料",
        body: "官网客服 · 交期与防腐方案",
        timeLabel: "今天 09:00",
        href: "/dashboard/conversations",
        unread: false,
        kind: "conversation",
      },
    ],
    unreadCount: 3,
    previewHint: getNotificationPreviewHint(),
  },
  "preview",
);

export type NotificationFeedSource = "upstream" | "preview";

export interface NotificationFeedResult extends NormalizedNotificationFeed {
  readStateScope: string;
  readPersistence: "bff-cookie" | "upstream";
}

export async function loadNotificationFeed(
  request: NextRequest,
): Promise<
  | { feed: NotificationFeedResult; upstreamError?: undefined }
  | { feed?: undefined; upstreamError: "UPSTREAM_ERROR" | "UPSTREAM_UNREACHABLE" }
> {
  const accessToken = getAuthAccessToken(request);
  const upstreamBase = process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL;
  let baseFeed = previewNotifications;
  let source: NotificationFeedSource = "preview";

  if (accessToken && upstreamBase) {
    try {
      const upstream = await fetch(`${getConsoleAuthApiBaseUrl()}/notifications`, {
        headers: { authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      });

      if (upstream.ok) {
        const payload = await upstream.json();
        baseFeed = normalizeNotificationFeed(payload, "upstream");
        source = "upstream";
      }
      // 上游 /notifications 不存在或出错（预览/内存模式下常见）时，
      // 不向上抛错，直接降级为演示通知列表，避免通知中心 502/503。
    } catch {
      // 连接失败同样降级，保持通知中心可用
    }
  }

  return { feed: applyReadOverlay(request, baseFeed, source) };
}

function applyReadOverlay(
  request: NextRequest,
  baseFeed: NormalizedNotificationFeed,
  source: NotificationFeedSource,
): NotificationFeedResult {
  const scope = resolveNotificationReadScope(request, source);
  if (source === "upstream") {
    return {
      ...baseFeed,
      readStateScope: scope,
      readPersistence: "upstream",
    };
  }

  const readIds = readNotificationReadIds(request, scope);
  const { items, unreadCount } = applyNotificationReadState(baseFeed.items, readIds);

  return {
    ...baseFeed,
    items,
    unreadCount,
    readStateScope: scope,
    readPersistence: "bff-cookie",
  };
}

export async function loadNotificationFeedForMutation(request: NextRequest): Promise<{
  feed: NotificationFeedResult;
  source: NotificationFeedSource;
}> {
  const accessToken = getAuthAccessToken(request);
  const upstreamBase = process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL;

  if (accessToken && upstreamBase) {
    try {
      const upstream = await fetch(`${getConsoleAuthApiBaseUrl()}/notifications`, {
        headers: { authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      });

      if (upstream.ok) {
        const payload = await upstream.json();
        const baseFeed = normalizeNotificationFeed(payload, "upstream");
        return {
          feed: applyReadOverlay(request, baseFeed, "upstream"),
          source: "upstream",
        };
      }

      if (upstream.status !== 404 && upstream.status !== 501) {
        throw new Error("UPSTREAM_ERROR");
      }
    } catch (error) {
      if (error instanceof Error && error.message === "UPSTREAM_ERROR") {
        throw error;
      }
    }
  }

  return {
    feed: applyReadOverlay(request, previewNotifications, "preview"),
    source: "preview",
  };
}
