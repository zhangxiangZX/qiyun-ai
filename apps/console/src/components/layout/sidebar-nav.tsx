"use client";

import Link from "next/link";
import { Badge, cn } from "@qiyun/ui";

import { getActiveNavItem, navigation } from "@/lib/navigation";
import { t } from "@/lib/i18n";
import { defaultLocale } from "@/lib/messages";

export function SidebarNav({ pathname }: { pathname: string }) {
  const active = getActiveNavItem(pathname);

  return (
    <aside className="flex h-full flex-col p-5">
      <div className="rounded-dialog border border-border bg-[linear-gradient(180deg,rgba(47,125,255,0.12),rgba(255,255,255,0))] p-5 shadow-card">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.28em] text-muted-foreground">
              Qiyun AI
            </p>
            <h1 className="mt-2 text-xl font-semibold text-card-foreground">
              {t(defaultLocale, "shell.brand")}
            </h1>
          </div>
          <Badge variant="secondary">MVP</Badge>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">{t(defaultLocale, "shell.subtitle")}</p>
      </div>

      <nav className="mt-6 space-y-1">
        {navigation.map((item) => {
          const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-card px-3 py-2.5 text-sm font-medium transition",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="flex-1">{item.title}</span>
              {isActive ? <span className="h-2 w-2 rounded-full bg-current" /> : null}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-3 rounded-dialog border border-border bg-card p-4 shadow-card">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
            {t(defaultLocale, "shell.workspace")}
          </p>
          <p className="text-sm font-medium text-card-foreground">{active?.title ?? "Overview"}</p>
        </div>
        <p className="text-sm text-muted-foreground">{t(defaultLocale, "shell.footer")}</p>
      </div>
    </aside>
  );
}
