"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronDown,
  CircleHelp,
  Layers3,
  Loader2,
  LogOut,
  MailPlus,
  Search,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import {
  Alert,
  Badge,
  Button,
  ConfirmDialog,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Skeleton,
} from "@qiyun/ui";

import { fetchAuthSession, logoutWithConsole, type AuthSession } from "@/lib/auth/client";
import { formatUserDisplayName } from "@/lib/auth/display-name";
import { getActiveNavItem } from "@/lib/navigation";
import { activateWorkspace } from "@/lib/auth/workspaces";
import { notifyWorkspaceChanged } from "@/lib/workspace-events";
import { memberRoleLabel } from "@/components/team/workspace-access-shared";
import { DashboardOverviewIcon } from "@/components/dashboard/overview/dashboard-overview-icons";
import { ConsoleModeBadge } from "@/components/console/console-data-mode-banner";
import { NotificationCenter } from "@/components/notifications/notification-center";

import { MobileNav } from "./mobile-nav";
import topbarStyles from "@/styles/dashboard-overview.module.css";

type SessionState = "loading" | "ready" | "error";

function WorkspaceSwitcher({
  session,
  activeWorkspace,
  switchingWorkspaceId,
  onSwitch,
  className,
}: {
  session: AuthSession | null;
  activeWorkspace: AuthSession["workspaces"][number] | null;
  switchingWorkspaceId: string | null;
  onSwitch: (workspaceId: string) => void;
  className?: string;
}) {
  const isLoading = !session;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={className}
          disabled={switchingWorkspaceId !== null}
          aria-label="切换工作区"
        >
          {switchingWorkspaceId ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
          ) : (
            <Layers3 className="h-4 w-4 shrink-0 text-muted-foreground" />
          )}
          <span className="truncate">
            {isLoading ? "加载工作区…" : (activeWorkspace?.name ?? "未选择工作区")}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>切换工作区</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {(session?.workspaces ?? []).length === 0 ? (
          <DropdownMenuItem disabled>暂无可用工作区</DropdownMenuItem>
        ) : (
          (session?.workspaces ?? []).map((workspace) => {
            const isActive = workspace.isActive;
            const isSwitching = workspace.id === switchingWorkspaceId;

            return (
              <DropdownMenuItem
                key={workspace.id}
                onClick={() => onSwitch(workspace.id)}
                className="flex items-center justify-between"
                disabled={switchingWorkspaceId !== null || isActive}
              >
                <span className="min-w-0">
                  <span className="block truncate">{workspace.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {memberRoleLabel(workspace.role)}
                  </span>
                </span>
                {isSwitching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isActive ? (
                  <Check className="h-4 w-4 text-primary" />
                ) : null}
              </DropdownMenuItem>
            );
          })
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ConsoleTopbar({
  pathname,
  platformRole,
}: {
  pathname: string;
  platformRole?: "platform_admin" | null;
}) {
  const router = useRouter();
  const [sessionState, setSessionState] = useState<SessionState>("loading");
  const [session, setSession] = useState<AuthSession | null>(null);
  const [switchingWorkspaceId, setSwitchingWorkspaceId] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [confirmSignOutOpen, setConfirmSignOutOpen] = useState(false);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const effectivePlatformRole = session?.user.platformRole ?? platformRole ?? null;
  const active = getActiveNavItem(pathname, effectivePlatformRole);

  const loadSession = () => {
    setSessionState("loading");
    setWorkspaceError(null);

    void fetchAuthSession()
      .then((data) => {
        setSession(data);
        setSessionState("ready");
      })
      .catch(() => {
        setSession(null);
        setSessionState("error");
      });
  };

  useEffect(() => {
    loadSession();
  }, []);

  const activeWorkspace = useMemo(
    () => session?.workspaces.find((item) => item.isActive) ?? session?.workspaces[0] ?? null,
    [session],
  );
  const displayName = useMemo(
    () => (session?.user ? formatUserDisplayName(session.user) : null),
    [session],
  );

  async function handleWorkspaceSwitch(workspaceId: string) {
    if (!session || workspaceId === activeWorkspace?.id) {
      return;
    }

    setSwitchingWorkspaceId(workspaceId);
    setWorkspaceError(null);

    try {
      const nextSession = await activateWorkspace(workspaceId);
      setSession(nextSession);
      notifyWorkspaceChanged();
      router.refresh();
    } catch (error) {
      setWorkspaceError(error instanceof Error ? error.message : "切换工作区失败，请重试。");
    } finally {
      setSwitchingWorkspaceId(null);
    }
  }

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await logoutWithConsole();
      router.push("/login");
      router.refresh();
    } finally {
      setSigningOut(false);
      setConfirmSignOutOpen(false);
    }
  }

  const todayLabel = useMemo(() => {
    const now = new Date();
    const parts = new Intl.DateTimeFormat("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      weekday: "long",
    }).formatToParts(now);
    const year = parts.find((part) => part.type === "year")?.value ?? "";
    const month = parts.find((part) => part.type === "month")?.value ?? "";
    const day = parts.find((part) => part.type === "day")?.value ?? "";
    const weekday = parts.find((part) => part.type === "weekday")?.value ?? "";
    return `今天是 ${year} 年 ${month} 月 ${day} 日 ${weekday}`;
  }, []);

  const isDashboardHome = pathname === "/dashboard";

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-[#eef2f8] bg-white">
        <div className="flex min-h-[91px] items-center gap-3 px-4 py-2 sm:px-6 lg:px-[30px]">
          <div className="flex min-w-0 items-center gap-3 lg:min-w-[220px]">
            <div className="lg:hidden">
              <MobileNav
                pathname={pathname}
                workspaceName={activeWorkspace?.name}
                userRole={activeWorkspace?.role}
                platformRole={effectivePlatformRole}
              />
            </div>

            <div className="min-w-0">
              {sessionState === "loading" ? (
                <Skeleton className="h-6 w-40" />
              ) : (
                <>
                  <p className="truncate text-[22px] font-medium tracking-[-0.03em] text-[#17274a]">
                    {displayName ? (
                      <>
                        欢迎回来，{displayName} <span className="text-lg">👋</span>
                      </>
                    ) : (
                      "欢迎使用企云 AI 控制台"
                    )}
                  </p>
                  <p className="truncate text-xs text-[#77869f]">{todayLabel}</p>
                </>
              )}
            </div>
          </div>

          <div className="hidden flex-1 justify-center px-2 md:flex">
            {isDashboardHome ? (
              <label className={topbarStyles.searchBox}>
                <input
                  type="search"
                  placeholder="搜索会话、线索、知识库…"
                  disabled
                  title="全局搜索即将上线"
                  aria-label="全局搜索"
                />
                <Search aria-hidden />
              </label>
            ) : (
              <div className="relative w-full max-w-xl">
                <Search
                  className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <input
                  type="search"
                  className="console-topbar-search"
                  placeholder="搜索会话、线索、知识库…"
                  disabled
                  title="全局搜索即将上线"
                  aria-label="全局搜索"
                />
              </div>
            )}
          </div>

          <div
            className={
              isDashboardHome
                ? `${topbarStyles.topbarTools} ml-auto`
                : "ml-auto flex flex-wrap items-center justify-end gap-2"
            }
          >
            {isDashboardHome ? (
              <>
                <WorkspaceSwitcher
                  session={session}
                  activeWorkspace={activeWorkspace}
                  switchingWorkspaceId={switchingWorkspaceId}
                  onSwitch={(workspaceId) => void handleWorkspaceSwitch(workspaceId)}
                  className="hidden"
                />
                <button
                  type="button"
                  className={topbarStyles.toolButton}
                  disabled
                  title="帮助中心即将上线"
                  aria-label="帮助"
                >
                  <CircleHelp />
                </button>
                <NotificationCenter
                  triggerVariant="dashboard"
                  triggerClassName={topbarStyles.toolButton}
                />
                <button type="button" className={topbarStyles.companySwitch} aria-label="切换企业">
                  <span className={topbarStyles.companyMark}>
                    <DashboardOverviewIcon name="cloudBot" />
                  </span>
                  <span>{activeWorkspace?.name ?? "企云科技有限公司"}</span>
                  <i className={topbarStyles.companyChevron}>⌄</i>
                </button>
              </>
            ) : (
              <>
            <WorkspaceSwitcher
              session={session}
              activeWorkspace={activeWorkspace}
              switchingWorkspaceId={switchingWorkspaceId}
              onSwitch={(workspaceId) => void handleWorkspaceSwitch(workspaceId)}
              className="hidden max-w-[220px] bg-card sm:inline-flex"
            />

            <WorkspaceSwitcher
              session={session}
              activeWorkspace={activeWorkspace}
              switchingWorkspaceId={switchingWorkspaceId}
              onSwitch={(workspaceId) => void handleWorkspaceSwitch(workspaceId)}
              className="inline-flex max-w-[180px] bg-card sm:hidden"
            />

            <NotificationCenter />

            <Button
              variant="outline"
              size="icon"
              className="hidden bg-card lg:inline-flex"
              disabled
              title="帮助中心即将上线"
              aria-label="帮助"
            >
              <CircleHelp className="h-4 w-4" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="bg-card">
                  <UserRound className="h-4 w-4 text-muted-foreground" />
                  <span className="hidden truncate sm:inline">
                    {sessionState === "loading" ? (
                      <Skeleton className="h-4 w-16" />
                    ) : (
                      (displayName ?? "账户")
                    )}
                  </span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div>
                    <p className="font-medium text-foreground">{displayName ?? "账户"}</p>
                    <p className="text-xs font-normal text-muted-foreground">
                      {session?.user.email ?? "未登录"}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/team" className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4" />
                    团队管理
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/invitations" className="flex items-center gap-2">
                    <MailPlus className="h-4 w-4" />
                    邀请审计
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => setConfirmSignOutOpen(true)}
                  disabled={signingOut}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  退出登录
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {sessionState === "error" ? (
              <Badge variant="destructive" className="text-xs">
                会话异常
              </Badge>
            ) : activeWorkspace ? (
              <Badge variant="secondary" className="text-xs">
                {memberRoleLabel(activeWorkspace.role)}
              </Badge>
            ) : null}
              </>
            )}
          </div>
        </div>

        {pathname !== "/dashboard" ? (
        <div className="flex items-center gap-2 border-t border-border/50 px-4 py-2 text-xs text-muted-foreground sm:px-6 lg:px-8">
          <span>控制台</span>
          <span aria-hidden>/</span>
          <span className="font-medium text-foreground/80">{active?.title ?? "概览"}</span>
          <ConsoleModeBadge />
        </div>
        ) : null}

        {workspaceError ? (
          <div className="border-t border-border/60 px-4 py-2 sm:px-6 lg:px-8">
            <Alert variant="error" title="切换失败">
              {workspaceError}
            </Alert>
          </div>
        ) : null}

        {sessionState === "error" ? (
          <div className="border-t border-border/60 px-4 py-2 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Alert variant="warning" title="无法加载账户信息">
                顶部栏部分功能可能不可用，请刷新页面或重新登录。
              </Alert>
              <Button size="sm" variant="outline" onClick={loadSession}>
                重试
              </Button>
            </div>
          </div>
        ) : null}
      </header>

      <ConfirmDialog
        open={confirmSignOutOpen}
        title="确认退出登录"
        description="退出后需要重新登录才能继续访问控制台。"
        confirmLabel="退出登录"
        cancelLabel="取消"
        destructive
        confirmLoading={signingOut}
        onCancel={() => setConfirmSignOutOpen(false)}
        onConfirm={() => void handleSignOut()}
      />
    </>
  );
}
