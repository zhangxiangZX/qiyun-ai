"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  Check,
  ChevronDown,
  HelpCircle,
  Loader2,
  LogOut,
  MailPlus,
  Search,
  ShieldCheck,
} from "lucide-react";
import {
  Alert,
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
import { BRAND_NAME } from "@/lib/brand";
import { formatUserDisplayName } from "@/lib/auth/display-name";
import { activateWorkspace } from "@/lib/auth/workspaces";
import { getActiveNavItem } from "@/lib/navigation";
import { notifyWorkspaceChanged } from "@/lib/workspace-events";
import { memberRoleLabel } from "@/components/team/workspace-access-shared";
import { NotificationCenter } from "@/components/notifications/notification-center";

import { MobileNav } from "./mobile-nav";

type SessionState = "loading" | "ready" | "error";

export function ConsoleTopbar({
  pathname,
  search,
  platformRole,
}: {
  pathname: string;
  search?: string;
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
  const active = getActiveNavItem(pathname, effectivePlatformRole, search);

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
  const pageTitle = active?.title ?? active?.groupTitle ?? "工作台";
  const roleHomeTitle =
    pathname === "/dashboard/boss"
      ? `您好，${displayName ?? "团队成员"}`
      : pathname === "/dashboard/admin"
        ? "您好，管理员"
        : pathname === "/dashboard/sales-rep"
          ? `您好，${displayName ?? "团队成员"} · 销售专员`
          : null;

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

  return (
    <>
      <header className="topbar console-topbar relative">
        <div className="topbar-title flex min-w-0 items-center gap-3">
          <div className="lg:hidden">
            <MobileNav
              pathname={pathname}
              search={search}
              workspaceName={activeWorkspace?.name}
              userRole={activeWorkspace?.role}
              platformRole={effectivePlatformRole}
            />
          </div>
          {roleHomeTitle ? (
            <div className="min-w-0">
              <h1 className="truncate">
                {sessionState === "loading" ? (
                  <Skeleton className="h-6 w-36" />
                ) : (
                  <>{roleHomeTitle} <span aria-hidden>👋</span></>
                )}
              </h1>
              <p className="mt-0.5 hidden text-xs text-[#697b98] sm:block">
                今天是 {new Date().toLocaleDateString("zh-CN", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  weekday: "long",
                })}
              </p>
            </div>
          ) : (
            <h1 className="truncate">
              {sessionState === "loading" ? <Skeleton className="h-6 w-28" /> : pageTitle}
            </h1>
          )}
        </div>

        <div className="topbar-search hidden md:block">
          <div className="search-wrap">
            <Search
              className="pointer-events-none absolute left-[14px] h-4 w-4 text-[#8190a8]"
              aria-hidden
            />
            <input
              className="search topbar-search-input"
              type="search"
              placeholder="搜索客户、线索、产品、知识库…"
              disabled
              title="全局搜索即将上线"
              aria-label="全局搜索"
            />
          </div>
        </div>

        <div className="topbar-tools tools">
          <button
            type="button"
            className="icon-btn"
            aria-label="帮助中心"
            title="帮助中心即将上线"
          >
            <HelpCircle size={20} />
          </button>

          <NotificationCenter triggerClassName="icon-btn" triggerVariant="dashboard" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="user company-user" aria-label="企业与账户">
                <div className="avatar company-avatar">
                  <Building2 size={20} />
                </div>
                <div className="user-info company-info hidden lg:flex">
                  <b>{activeWorkspace?.name ?? BRAND_NAME}</b>
                </div>
                <ChevronDown
                  className="hidden h-4 w-4 shrink-0 text-[#8190a8] lg:block"
                  aria-hidden
                />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>
                <div>
                  <p className="font-medium text-foreground">{displayName ?? "账户"}</p>
                  <p className="text-xs font-normal text-muted-foreground">
                    {session?.user.email ?? "未登录"}
                  </p>
                  {activeWorkspace ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {activeWorkspace.name} / {memberRoleLabel(activeWorkspace.role)}
                    </p>
                  ) : null}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {(session?.workspaces ?? []).length > 1 ? (
                <>
                  <DropdownMenuLabel>切换工作区</DropdownMenuLabel>
                  {(session?.workspaces ?? []).map((workspace) => {
                    const isActive = workspace.isActive;
                    const isSwitching = workspace.id === switchingWorkspaceId;

                    return (
                      <DropdownMenuItem
                        key={workspace.id}
                        onClick={() => void handleWorkspaceSwitch(workspace.id)}
                        className="flex items-center justify-between"
                        disabled={switchingWorkspaceId !== null || isActive}
                      >
                        <span className="min-w-0 truncate">{workspace.name}</span>
                        {isSwitching ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : isActive ? (
                          <Check className="h-4 w-4 text-primary" />
                        ) : null}
                      </DropdownMenuItem>
                    );
                  })}
                  <DropdownMenuSeparator />
                </>
              ) : null}
              <DropdownMenuItem asChild>
                <Link href="/dashboard/team" className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  团队管理
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/team/invite" className="flex items-center gap-2">
                  <MailPlus className="h-4 w-4" />
                  邀请成员
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
        </div>

        {workspaceError ? (
          <div className="absolute inset-x-0 top-full border-t border-[var(--line)] bg-white px-4 py-2">
            <Alert variant="error" title="切换失败">
              {workspaceError}
            </Alert>
          </div>
        ) : null}
      </header>

      {sessionState === "error" ? (
        <div className="border-b border-[var(--line)] bg-white px-4 py-2 sm:px-6 lg:px-8">
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
