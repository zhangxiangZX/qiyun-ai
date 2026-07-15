"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { NotificationPanel, type NotificationItem } from "@qiyun/ui";

import {
  fetchNotifications,
  markNotificationsRead,
  type NotificationLoadState,
} from "@/lib/notifications/api";
import { getNotificationEmptyHint, getPreviewNoticeTitle } from "@/lib/console/mode-copy";
import { t } from "@/lib/i18n";
import { defaultLocale } from "@/lib/messages";
import { useOnWorkspaceChanged } from "@/lib/workspace-events";

export interface NotificationCenterProps {
  triggerVariant?: "icon" | "dashboard";
  triggerClassName?: string;
  triggerIconSrc?: string;
}

export function NotificationCenter({
  triggerVariant = "icon",
  triggerClassName,
  triggerIconSrc,
}: NotificationCenterProps) {
  const [state, setState] = useState<NotificationLoadState>("loading");
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [previewHint, setPreviewHint] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loadNotice, setLoadNotice] = useState<string | null>(null);
  const [markingRead, setMarkingRead] = useState(false);

  const load = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    if (mode === "initial") {
      setState("loading");
      setLoadNotice(null);
    }
    setErrorMessage(null);
    try {
      const feed = await fetchNotifications();
      setItems(feed.items);
      setUnreadCount(feed.unreadCount);
      setPreviewHint(feed.previewHint ?? null);
      setState("ready");
    } catch (error) {
      if (mode === "initial") {
        setItems([]);
        setUnreadCount(0);
      }
      setErrorMessage(error instanceof Error ? error.message : "通知加载失败。");
      setState("error");
    }
  }, []);

  useEffect(() => {
    void load("initial");
  }, [load]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void load("refresh");
    }, 30_000);

    const handleFocus = () => {
      void load("refresh");
    };

    window.addEventListener("focus", handleFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", handleFocus);
    };
  }, [load]);

  useOnWorkspaceChanged(() => {
    void load("refresh");
  });

  const applyReadLocally = useCallback((markedIds: string[]) => {
    if (!markedIds.length) return;
    const marked = new Set(markedIds);
    setItems((current) => {
      const next = current.filter((item) => !marked.has(item.id));
      setUnreadCount(next.filter((item) => item.unread).length);
      return next;
    });
  }, []);

  const handleMarkRead = useCallback(
    async (ids: string[]) => {
      if (!ids.length) return;
      applyReadLocally(ids);
      setMarkingRead(true);
      try {
        const result = await markNotificationsRead({ ids });
        setUnreadCount(result.unreadCount);
        const marked = new Set(result.markedIds);
        setItems((current) => current.filter((item) => !marked.has(item.id)));
      } catch {
        void load("refresh");
      } finally {
        setMarkingRead(false);
      }
    },
    [applyReadLocally, load],
  );

  const handleMarkAllRead = useCallback(async () => {
    const unreadIds = items.filter((item) => item.unread).map((item) => item.id);
    if (!unreadIds.length) return;

    applyReadLocally(unreadIds);
    setMarkingRead(true);
    try {
      const result = await markNotificationsRead({ all: true, ids: unreadIds });
      setUnreadCount(result.unreadCount);
      setItems([]);
      setLoadNotice(t(defaultLocale, "mode.feedback.markAllRead"));
    } catch {
      void load("refresh");
    } finally {
      setMarkingRead(false);
    }
  }, [applyReadLocally, items, load]);

  const handleItemActivate = useCallback(
    (item: NotificationItem) => {
      if (item.unread) {
        void handleMarkRead([item.id]);
      }
    },
    [handleMarkRead],
  );

  return (
    <NotificationPanel
      items={items}
      unreadCount={unreadCount}
      loading={state === "loading"}
      markingRead={markingRead}
      errorMessage={state === "error" ? errorMessage : null}
      previewHint={previewHint}
      previewHintTitle={previewHint ? getPreviewNoticeTitle("preview") : null}
      emptyHint={previewHint ? getNotificationEmptyHint("preview") : getNotificationEmptyHint("upstream")}
      successMessage={loadNotice}
      triggerVariant={triggerVariant}
      triggerClassName={triggerClassName}
      triggerIconSrc={triggerIconSrc}
      onRetry={() => void load("refresh")}
      onMarkAllRead={() => void handleMarkAllRead()}
      onItemClick={handleItemActivate}
      renderItemLink={(item, children) =>
        item.href ? (
          <Link
            href={item.href}
            className="block"
            onClick={() => handleItemActivate(item)}
          >
            {children}
          </Link>
        ) : (
          <button
            type="button"
            className="block w-full text-left"
            onClick={() => handleItemActivate(item)}
          >
            {children}
          </button>
        )
      }
    />
  );
}
