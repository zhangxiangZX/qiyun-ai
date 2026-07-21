"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronLeft } from "lucide-react";

import { cn } from "@qiyun/ui";

import { BrandLogo } from "@/components/brand/brand-logo";
import { BRAND_DOMAIN, BRAND_ICON_SRC, BRAND_NAME } from "@/lib/brand";
import { fetchAuthSession, type AuthSession } from "@/lib/auth/client";
import { resolveActiveWorkspace, type WorkspaceRole } from "@/lib/auth/workspace-home";
import {
  defaultExpandedNavigationGroupIds,
  getActiveNavItem,
  getNavigationGroups,
  isNavigationGroupActive,
  isNavigationLinkActive,
  type NavigationGroup,
} from "@/lib/navigation";
import { WORKSPACE_CHANGED_EVENT } from "@/lib/workspace-events";

function NavExpandIcon({ expanded }: { expanded: boolean }) {
  return (
    <span
      className={cn("nav-group-chevron", expanded && "nav-group-chevron--open")}
      aria-hidden
    >
      <ChevronDown size={14} strokeWidth={2.25} />
    </span>
  );
}

function SidebarNavGroup({
  group,
  pathname,
  search,
  platformRole,
  workspaceRole,
  onNavigate,
  variant,
}: {
  group: NavigationGroup;
  pathname: string;
  search?: string;
  platformRole?: "platform_admin" | null;
  workspaceRole?: WorkspaceRole | null;
  onNavigate?: () => void;
  variant: "sidebar" | "drawer";
}) {
  const isDark = variant === "sidebar";
  const Icon = group.icon;
  const groupActive = isNavigationGroupActive(
    group,
    pathname,
    search,
    platformRole,
    workspaceRole,
  );
  const [expanded, setExpanded] = useState(
    groupActive || defaultExpandedNavigationGroupIds.has(group.id),
  );

  useEffect(() => {
    if (groupActive) {
      setExpanded(true);
    }
  }, [groupActive]);

  if (group.href && !group.children?.length) {
    const isActive = group.exact ? pathname === group.href : pathname.startsWith(group.href);

    if (isDark) {
      return (
        <Link
          href={group.href}
          prefetch={false}
          onClick={onNavigate}
          className={cn("nav-standalone-link", isActive && "active")}
        >
          <i>
            <Icon aria-hidden />
          </i>
          <span>{group.title}</span>
        </Link>
      );
    }

    return (
      <Link
        href={group.href}
        prefetch={false}
        onClick={onNavigate}
        className={cn(
          "flex items-center gap-3 rounded-control px-3 py-2.5 text-sm font-medium transition-colors",
          isActive
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-accent hover:text-foreground",
        )}
      >
        <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
        <span className="flex-1">{group.title}</span>
      </Link>
    );
  }

  if (isDark) {
    return (
      <div className={cn("nav-group", groupActive && "nav-group--active")}>
        <button
          type="button"
          className="nav-group-toggle"
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
        >
          <i>
            <Icon aria-hidden />
          </i>
          <span>{group.title}</span>
          <NavExpandIcon expanded={expanded} />
        </button>
        {expanded ? (
          <div className="nav-sublist">
            {group.children?.map((child) => {
              const isActive = isNavigationLinkActive(
                child,
                pathname,
                search,
                platformRole,
                workspaceRole,
              );
              return (
                <Link
                  key={child.id}
                  href={child.href}
                  prefetch={false}
                  onClick={onNavigate}
                  className={cn("nav-subitem", isActive && "active")}
                >
                  {child.title}
                </Link>
              );
            })}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      <button
        type="button"
        className="flex w-full items-center gap-3 rounded-control px-3 py-2 text-sm font-semibold text-foreground"
        aria-expanded={expanded}
        onClick={() => setExpanded((value) => !value)}
      >
        <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
        <span className="flex-1 text-left">{group.title}</span>
        <NavExpandIcon expanded={expanded} />
      </button>
      {expanded ? (
        <div className="space-y-0.5 pb-1 pl-3">
          {group.children?.map((child) => {
            const isActive = isNavigationLinkActive(
              child,
              pathname,
              search,
              platformRole,
              workspaceRole,
            );
            return (
              <Link
                key={child.id}
                href={child.href}
                prefetch={false}
                onClick={onNavigate}
                className={cn(
                  "flex items-center rounded-control px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-primary/10 font-medium text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                {child.title}
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function SidebarNav({
  pathname,
  search,
  onNavigate,
  variant = "sidebar",
  platformRole,
  collapsed = false,
  onToggleCollapse,
}: {
  pathname: string;
  search?: string;
  onNavigate?: () => void;
  variant?: "sidebar" | "drawer";
  platformRole?: "platform_admin" | null;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}) {
  const isDark = variant === "sidebar";
  const [session, setSession] = useState<AuthSession | null>(null);
  const effectivePlatformRole = session?.user.platformRole ?? platformRole ?? null;
  const workspaceRole = useMemo(() => {
    if (!session) return null;
    return resolveActiveWorkspace(session.workspaces, session.user.activeWorkspaceId)?.role ?? null;
  }, [session]);
  const navigationGroups = useMemo(
    () => getNavigationGroups(effectivePlatformRole, workspaceRole),
    [effectivePlatformRole, workspaceRole],
  );
  const active = useMemo(
    () => getActiveNavItem(pathname, effectivePlatformRole, search, workspaceRole),
    [effectivePlatformRole, pathname, search, workspaceRole],
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

        <nav
          aria-label="主导航"
          className="console-scrollbar-hidden mt-6 flex-1 space-y-2 overflow-y-auto"
        >
          {navigationGroups.map((group) => (
            <SidebarNavGroup
              key={group.id}
              group={group}
              pathname={pathname}
              search={search}
              platformRole={effectivePlatformRole}
              workspaceRole={workspaceRole}
              onNavigate={onNavigate}
              variant={variant}
            />
          ))}
        </nav>

        <div className="mt-4 rounded-card border border-border/70 bg-muted/30 px-4 py-3">
          <p className="text-xs font-medium text-muted-foreground">当前页面</p>
          <p className="mt-1 text-sm font-medium text-foreground">
            {active ? `${active.groupTitle} / ${active.title}` : "工作台"}
          </p>
        </div>
      </aside>
    );
  }

  return (
    <aside className={cn("sidebar console-scrollbar-hidden", collapsed && "sidebar--collapsed")}>
      <div className="brand">
        <div className="brandMark">
          <img src={BRAND_ICON_SRC} alt={BRAND_NAME} width={28} height={28} />
        </div>
        {!collapsed ? (
          <div>
            <b>{BRAND_NAME}</b>
            <small>{BRAND_DOMAIN}</small>
          </div>
        ) : null}
      </div>

      <div className="nav-groups">
        {navigationGroups.map((group) => (
          <SidebarNavGroup
            key={group.id}
            group={group}
            pathname={pathname}
            search={search}
            platformRole={effectivePlatformRole}
            workspaceRole={workspaceRole}
            onNavigate={onNavigate}
            variant={variant}
          />
        ))}
      </div>

      <button
        type="button"
        className="nav-collapse-btn"
        onClick={onToggleCollapse}
        aria-label={collapsed ? "展开菜单" : "收起菜单"}
      >
        <ChevronLeft size={18} />
        {!collapsed ? <span>收起菜单</span> : null}
      </button>
    </aside>
  );
}
