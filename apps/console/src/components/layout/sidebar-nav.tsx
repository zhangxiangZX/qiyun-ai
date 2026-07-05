"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { cn } from "@qiyun/ui";

import { BrandLogo } from "@/components/brand/brand-logo";
import { fetchAuthSession, type AuthSession } from "@/lib/auth/client";
import { formatUserDisplayName } from "@/lib/auth/display-name";
import { getActiveNavItem, getNavigation } from "@/lib/navigation";
import { memberRoleLabel } from "@/components/team/workspace-access-shared";
import { WORKSPACE_CHANGED_EVENT } from "@/lib/workspace-events";

function getInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  return trimmed.slice(0, 1).toUpperCase();
}

function hasNavChevron(href: string): boolean {
  return href !== "/dashboard" && href !== "/dashboard/conversations";
}

export function SidebarNav({
  pathname,
  onNavigate,
  variant = "sidebar",
  platformRole,
}: {
  pathname: string;
  onNavigate?: () => void;
  variant?: "sidebar" | "drawer";
  platformRole?: "platform_admin" | null;
}) {
  const isDark = variant === "sidebar";
  const [session, setSession] = useState<AuthSession | null>(null);
  const effectivePlatformRole = session?.user.platformRole ?? platformRole ?? null;
  const navigation = useMemo(() => getNavigation(effectivePlatformRole), [effectivePlatformRole]);
  const active = useMemo(
    () => getActiveNavItem(pathname, effectivePlatformRole),
    [effectivePlatformRole, pathname],
  );

  const activeWorkspace = useMemo(
    () => session?.workspaces.find((item) => item.isActive) ?? session?.workspaces[0] ?? null,
    [session],
  );
  const displayName = useMemo(
    () => (session?.user ? formatUserDisplayName(session.user) : null),
    [session],
  );

  useEffect(() => {
    const load = () => {
      void fetchAuthSession()
        .then(setSession)
        .catch(() => setSession(null));
    };
    load();
    window.addEventListener(WORKSPACE_CHANGED_EVENT, load);
    return () => window.removeEventListener(WORKSPACE_CHANGED_EVENT, load);
  }, []);

  if (!isDark) {
    return (
      <aside className="flex h-full flex-col px-4 py-5">
        <BrandLogo size="md" variant="circle" showWordmark />

        <nav className="mt-6 flex-1 space-y-0.5 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-3 rounded-control px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
                <span className="flex-1">{item.title}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-4 rounded-card border border-border/70 bg-muted/30 px-4 py-3">
          <p className="text-xs font-medium text-muted-foreground">当前页面</p>
          <p className="mt-1 text-sm font-medium text-foreground">{active?.title ?? "概览"}</p>
        </div>
      </aside>
    );
  }

  return (
    <aside className="console-sidebar">
      <div className="console-sidebar__logo">
        <BrandLogo
          size="md"
          variant="circle"
          tone="on-dark"
          showWordmark
          showSubtitle
          englishSubtitle="Qiyun AI"
          className="console-sidebar__logo-brand"
        />
      </div>

      <nav className="console-sidebar__nav">
        {navigation.map((item) => {
          const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "console-sidebar__nav-item",
                isActive && "console-sidebar__nav-item--active",
              )}
            >
              <Icon className="console-sidebar__nav-icon" aria-hidden />
              <span className="console-sidebar__nav-label">{item.title}</span>
              {hasNavChevron(item.href) ? (
                <i className="console-sidebar__nav-chevron">⌄</i>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="console-sidebar__bottom">
        <section className="console-sidebar__plan">
          <strong className="console-sidebar__plan-title">企云 AI 旗舰版</strong>
          <span className="console-sidebar__plan-subtitle">智能获客 · 高效转化</span>
          <Link href="/dashboard/team" className="console-sidebar__plan-btn" onClick={onNavigate}>
            升级套餐
          </Link>
        </section>

        <Link href="/dashboard/team" className="console-sidebar__user" onClick={onNavigate}>
          <span className="console-sidebar__user-avatar">
            {getInitials(displayName ?? session?.user.email ?? "?")}
          </span>
          <span className="min-w-0 flex-1">
            <b className="console-sidebar__user-name">{displayName ?? "未登录"}</b>
            <small className="console-sidebar__user-role">
              {activeWorkspace?.role
                ? memberRoleLabel(activeWorkspace.role)
                : (session?.user.email ?? "—")}
            </small>
          </span>
          <i className="console-sidebar__user-chevron">›</i>
        </Link>
      </div>
    </aside>
  );
}
