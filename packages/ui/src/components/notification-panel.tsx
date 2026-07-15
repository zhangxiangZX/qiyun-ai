import type { ReactNode } from "react";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  FileWarning,
  UserPlus,
} from "lucide-react";

import { Alert } from "./alert";
import { Badge } from "./badge";
import { Button } from "./button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "./dropdown-menu";

export type NotificationKind = "lead" | "conversation" | "system" | "document" | "invite";

export interface NotificationItem {
  id: string;
  title: string;
  body?: string;
  timeLabel: string;
  href?: string;
  unread?: boolean;
  kind?: NotificationKind;
}

export interface NotificationPanelProps {
  items: NotificationItem[];
  unreadCount: number;
  loading?: boolean;
  errorMessage?: string | null;
  previewHint?: string | null;
  previewHintTitle?: string | null;
  emptyHint?: string | null;
  successMessage?: string | null;
  markingRead?: boolean;
  triggerClassName?: string;
  triggerVariant?: "icon" | "dashboard";
  triggerIconSrc?: string;
  onRetry?: () => void;
  onMarkAllRead?: () => void;
  onItemClick?: (item: NotificationItem) => void;
  renderItemLink?: (item: NotificationItem, children: ReactNode) => ReactNode;
}

function resolveKindMeta(kind: NotificationKind | undefined): {
  label: string;
  hint: string;
  variant: "success" | "warning" | "destructive" | "info" | "secondary";
  icon: typeof Bell;
} {
  switch (kind) {
    case "lead":
      return {
        label: "新线索",
        hint: "有新的访客留资等待销售跟进",
        variant: "success",
        icon: UserPlus,
      };
    case "document":
      return {
        label: "文档失败",
        hint: "知识库文档处理或索引出现问题",
        variant: "destructive",
        icon: FileWarning,
      };
    case "invite":
      return {
        label: "邀请失败",
        hint: "成员邀请邮件未能成功送达",
        variant: "warning",
        icon: AlertTriangle,
      };
    case "conversation":
      return { label: "高意向", hint: "访客咨询被识别为高意向", variant: "warning", icon: Bell };
    case "system":
    default:
      return { label: "系统", hint: "系统通知", variant: "secondary", icon: Bell };
  }
}

export function NotificationPanel({
  items,
  unreadCount,
  loading = false,
  errorMessage = null,
  previewHint = null,
  previewHintTitle = "演示模式",
  emptyHint = null,
  successMessage = null,
  markingRead = false,
  triggerClassName,
  triggerVariant = "icon",
  triggerIconSrc,
  onRetry,
  onMarkAllRead,
  onItemClick,
  renderItemLink,
}: NotificationPanelProps) {
  const badgeCount = unreadCount > 99 ? "99+" : String(unreadCount);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {triggerVariant === "dashboard" ? (
          <button type="button" className={triggerClassName} aria-label="通知">
            {triggerIconSrc ? (
              <img src={triggerIconSrc} alt="" width={20} height={20} />
            ) : (
              <Bell />
            )}
            {unreadCount > 0 ? <em>{badgeCount}</em> : null}
          </button>
        ) : (
          <Button
            variant="outline"
            size="icon"
            className={`relative bg-card ${triggerClassName ?? ""}`}
            aria-label="通知"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-destructive-foreground">
                {badgeCount}
              </span>
            ) : null}
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[min(100vw-2rem,22rem)] p-0 animate-scale-in">
        <div className="border-b border-border px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-foreground">通知中心</p>
            <div className="flex items-center gap-2">
              {!loading && !errorMessage ? (
                <Badge variant="outline">{items.length} 条</Badge>
              ) : null}
              {!loading && !errorMessage && unreadCount > 0 && onMarkAllRead ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs"
                  disabled={markingRead}
                  onClick={onMarkAllRead}
                >
                  全部已读
                </Button>
              ) : null}
            </div>
          </div>
          {previewHint ? (
            <Alert variant="warning" title={previewHintTitle ?? "演示模式"} className="mt-2 px-2 py-1.5 text-xs">
              {previewHint}
            </Alert>
          ) : null}
          {successMessage ? (
            <p className="mt-1 flex items-center gap-1 text-xs text-success">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
              {successMessage}
            </p>
          ) : null}
        </div>

        <div className="max-h-[min(60vh,24rem)] overflow-y-auto p-2">
          {loading ? (
            <div className="space-y-2 px-3 py-4" aria-busy="true">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="h-14 animate-pulse rounded-control bg-muted/60" />
              ))}
              <p className="text-center text-xs text-muted-foreground">加载通知中…</p>
            </div>
          ) : errorMessage ? (
            <div className="space-y-3 px-3 py-4">
              <Alert variant="error" title="通知加载失败">
                {errorMessage}
              </Alert>
              {onRetry ? (
                <Button size="sm" variant="outline" onClick={onRetry}>
                  重试
                </Button>
              ) : null}
            </div>
          ) : items.length === 0 ? (
            <div className="px-3 py-8 text-center">
              <Bell className="mx-auto h-8 w-8 text-muted-foreground/50" aria-hidden />
              <p className="mt-3 text-sm font-medium text-card-foreground">暂无通知</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {emptyHint ?? "新线索、文档失败、邀请失败等事件会出现在这里。"}
              </p>
            </div>
          ) : (
            <ul className="space-y-1">
              {items.map((item) => {
                const kindMeta = resolveKindMeta(item.kind);
                const KindIcon = kindMeta.icon;
                const content = (
                  <div
                    className={`rounded-control px-3 py-2.5 transition-colors hover:bg-accent/50 ${
                      item.unread ? "bg-primary/5" : ""
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <span
                        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                          kindMeta.variant === "success"
                            ? "bg-success/10 text-success"
                            : kindMeta.variant === "destructive"
                              ? "bg-destructive/10 text-destructive"
                              : kindMeta.variant === "warning"
                                ? "bg-warning/10 text-warning"
                                : kindMeta.variant === "info"
                                  ? "bg-info/10 text-info"
                                  : "bg-muted text-muted-foreground"
                        }`}
                      >
                        <KindIcon className="h-3.5 w-3.5" aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium text-card-foreground">{item.title}</p>
                          <Badge variant={kindMeta.variant} className="text-[10px]">
                            {kindMeta.label}
                          </Badge>
                          {item.unread ? (
                            <Badge variant="info" className="text-[10px]">
                              未读
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px]">
                              已读
                            </Badge>
                          )}
                        </div>
                        {item.body ? (
                          <p className="mt-1 text-xs text-muted-foreground">{item.body}</p>
                        ) : (
                          <p className="mt-1 text-xs text-muted-foreground">{kindMeta.hint}</p>
                        )}
                        <p className="mt-1 text-xs text-muted-foreground">{item.timeLabel}</p>
                      </div>
                    </div>
                  </div>
                );

                return (
                  <li key={item.id}>
                    {renderItemLink ? (
                      renderItemLink(item, content)
                    ) : (
                      <button
                        type="button"
                        className="block w-full text-left"
                        onClick={() => onItemClick?.(item)}
                      >
                        {content}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
