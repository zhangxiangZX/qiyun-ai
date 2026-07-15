import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Badge, PageHeader, Skeleton } from "@qiyun/ui";

import { ConsoleRequestError } from "@/components/console/console-request-error";
import {
  ConsoleDataModeBanner,
  ConsoleModeBadge,
} from "@/components/console/console-data-mode-banner";

export const WORKSPACE_ACCESS_EYEBROW = "工作区权限";

export type InviteStatus = "pending" | "accepted" | "revoked" | "expired";
export type MemberRole = "owner" | "admin" | "member";

const inviteStatusLabels: Record<InviteStatus, string> = {
  pending: "待接受",
  accepted: "已接受",
  revoked: "已撤销",
  expired: "已过期",
};

const roleLabels: Record<MemberRole, string> = {
  owner: "所有者",
  admin: "管理员",
  member: "成员",
};

export function inviteStatusLabel(status: InviteStatus | string) {
  return inviteStatusLabels[status as InviteStatus] ?? status;
}

export function memberRoleLabel(role: MemberRole | string) {
  return roleLabels[role as MemberRole] ?? role;
}

export function inviteStatusVariant(status: InviteStatus | string) {
  switch (status) {
    case "accepted":
      return "success" as const;
    case "revoked":
      return "destructive" as const;
    case "expired":
      return "warning" as const;
    default:
      return "info" as const;
  }
}

export function memberRoleVariant(role: MemberRole | string) {
  if (role === "owner") return "default" as const;
  if (role === "admin") return "secondary" as const;
  return "outline" as const;
}

export function formatWorkspaceDate(
  value: string | null,
  style: "date" | "datetime" = "datetime",
) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    ...(style === "datetime" ? { timeStyle: "short" as const } : {}),
  }).format(new Date(value));
}

export function WorkspaceAccessCard({
  title,
  description,
  icon: Icon,
  children,
  className,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={[
        "rounded-card border border-border bg-card p-4 shadow-card sm:p-5",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="mb-4 flex items-start gap-3">
        {Icon ? <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden /> : null}
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{title}</p>
          {description ? (
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
          ) : null}
        </div>
      </div>
      {children}
    </section>
  );
}

export function WorkspaceDetailGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid gap-4 rounded-card border border-border bg-background/70 p-4 sm:grid-cols-2 sm:p-5">
      {children}
    </div>
  );
}

export function WorkspaceDetailItem({
  label,
  icon: Icon,
  value,
}: {
  label: string;
  icon?: LucideIcon;
  value: ReactNode;
}) {
  return (
    <div className="space-y-1">
      <p className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
        {Icon ? <Icon className="h-3.5 w-3.5" aria-hidden /> : null}
        {label}
      </p>
      <div className="text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}

export function InviteStatusBadge({ status }: { status: InviteStatus | string }) {
  return <Badge variant={inviteStatusVariant(status)}>{inviteStatusLabel(status)}</Badge>;
}

type WorkspacePageState = "loading" | "ready" | "error";

export function WorkspaceAccessPageShell({
  title,
  description,
  actions,
  state,
  errorMessage,
  onRetry,
  modeFeature,
  children,
}: {
  title: string;
  description: string;
  actions?: ReactNode;
  state: WorkspacePageState;
  errorMessage?: string | null;
  onRetry?: () => void;
  modeFeature?: string;
  children?: ReactNode;
}) {
  const headerActions = (
    <div className="flex flex-wrap items-center gap-2">
      {modeFeature ? <ConsoleModeBadge /> : null}
      {actions}
    </div>
  );

  const modeBanner = modeFeature ? (
    <ConsoleDataModeBanner feature={modeFeature} />
  ) : null;

  if (state === "loading") {
    return (
      <div className="page-stack">
        <PageHeader
          variant="compact"
          eyebrow={WORKSPACE_ACCESS_EYEBROW}
          title={title}
          description={description}
          actions={headerActions}
        />
        {modeBanner}
        <Skeleton className="h-[220px] rounded-card" />
        <Skeleton className="h-[360px] rounded-card" />
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="page-stack">
        <PageHeader
          variant="compact"
          eyebrow={WORKSPACE_ACCESS_EYEBROW}
          title={title}
          description={description}
          actions={headerActions}
        />
        {modeBanner}
        <ConsoleRequestError
          kind="network"
          message={errorMessage ?? "暂时无法获取数据，请稍后重试。"}
          onRetry={onRetry}
          retryLabel="重新加载"
        />
      </div>
    );
  }

  return (
    <div className="page-stack">
      <PageHeader
        variant="compact"
        eyebrow={WORKSPACE_ACCESS_EYEBROW}
        title={title}
        description={description}
        actions={headerActions}
      />
      {modeBanner}
      {children}
    </div>
  );
}

export function WorkspaceAccessPanelSkeleton() {
  return (
    <div className="w-full max-w-xl space-y-4 rounded-dialog border border-border bg-card p-6 shadow-card sm:p-8">
      <Skeleton className="h-4 w-28" />
      <Skeleton className="h-9 w-3/4" />
      <Skeleton className="h-24 rounded-card" />
      <Skeleton className="h-32 rounded-card" />
    </div>
  );
}
