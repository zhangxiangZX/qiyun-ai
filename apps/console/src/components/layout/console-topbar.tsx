"use client";

import { useState } from "react";
import { Bell, Check, ChevronDown, Layers3, Search, UserRound } from "lucide-react";
import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@qiyun/ui";

import { t } from "@/lib/i18n";
import { defaultLocale } from "@/lib/messages";
import { getActiveNavItem } from "@/lib/navigation";

import { MobileNav } from "./mobile-nav";

const workspaces = [
  { id: "ws-demo", name: "演示工作区", role: "Admin" },
  { id: "ws-sales", name: "销售团队", role: "Operator" },
  { id: "ws-support", name: "客服中心", role: "Viewer" },
];

const notifications = [
  { id: "n1", title: "3 条线索待跟进", time: "10 分钟前" },
  { id: "n2", title: "知识库索引已完成", time: "1 小时前" },
  { id: "n3", title: "官网 Widget 流量上升", time: "今天 09:00" },
];

export function ConsoleTopbar({ pathname }: { pathname: string }) {
  const active = getActiveNavItem(pathname);
  const [workspaceId, setWorkspaceId] = useState(workspaces[0].id);
  const activeWorkspace = workspaces.find((item) => item.id === workspaceId) ?? workspaces[0];

  return (
    <header className="sticky top-0 z-30 border-b border-border/80 bg-background/80 backdrop-blur-xl">
      <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-page">
        <div className="flex min-w-0 items-center gap-3">
          <div className="lg:hidden">
            <MobileNav pathname={pathname} />
          </div>

          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-[0.28em] text-muted-foreground">
              Qiyun AI
            </p>
            <h2 className="truncate text-lg font-semibold text-foreground">
              {active?.title ?? "Console"}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="hidden max-w-[180px] sm:inline-flex">
                <Layers3 className="h-4 w-4 shrink-0" />
                <span className="truncate">{activeWorkspace.name}</span>
                <ChevronDown className="h-4 w-4 shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>{t(defaultLocale, "topbar.workspace.label")}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {workspaces.map((workspace) => (
                <DropdownMenuItem
                  key={workspace.id}
                  onClick={() => setWorkspaceId(workspace.id)}
                  className="flex items-center justify-between"
                >
                  <span>
                    {workspace.name}
                    <span className="ml-2 text-xs text-muted-foreground">{workspace.role}</span>
                  </span>
                  {workspace.id === workspaceId ? <Check className="h-4 w-4" /> : null}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="relative" aria-label="通知">
                <Bell className="h-4 w-4" />
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-destructive-foreground">
                  {notifications.length}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              <DropdownMenuLabel>{t(defaultLocale, "topbar.notifications.label")}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {notifications.map((item) => (
                <DropdownMenuItem key={item.id} className="flex flex-col items-start gap-1 py-2">
                  <span className="font-medium">{item.title}</span>
                  <span className="text-xs text-muted-foreground">{item.time}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="outline" size="sm" className="hidden md:inline-flex">
            <Search className="h-4 w-4" />
            {t(defaultLocale, "topbar.search")}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="hidden sm:inline-flex">
                <UserRound className="h-4 w-4" />
                {t(defaultLocale, "topbar.account")}
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>{t(defaultLocale, "topbar.accountMenu.label")}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>{t(defaultLocale, "topbar.accountMenu.profile")}</DropdownMenuItem>
              <DropdownMenuItem>{t(defaultLocale, "topbar.accountMenu.team")}</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">
                {t(defaultLocale, "topbar.accountMenu.signOut")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Badge variant="secondary" className="sm:hidden">
            {activeWorkspace.name}
          </Badge>
        </div>
      </div>
    </header>
  );
}
