"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Alert, Button, PageHeader, Skeleton, cn } from "@qiyun/ui";

import { BotChatPreview } from "@/components/bots/bot-chat-preview";
import { useBotEdit } from "@/components/bots/bot-edit-context";
import { BotStatusBadge } from "@/components/bots/bot-status-badge";
import { botEditNav, getBotEditSection } from "@/lib/bots/navigation";
import { t } from "@/lib/i18n";
import { defaultLocale } from "@/lib/messages";

export function BotEditShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { bot, loading, error, reload } = useBotEdit();
  const activeSection = getBotEditSection(pathname);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6 xl:grid-cols-[200px_minmax(0,1fr)_320px]">
          <Skeleton className="h-64 rounded-card" />
          <Skeleton className="h-96 rounded-card" />
          <Skeleton className="h-96 rounded-card" />
        </div>
      </div>
    );
  }

  if (error || !bot) {
    return (
      <div className="space-y-4">
        <Alert variant="error" title={t(defaultLocale, "bots.edit.notFound")} />
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => void reload()}>
            {t(defaultLocale, "dashboard.error.retry")}
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/bots">{t(defaultLocale, "bots.edit.backToList")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/bots">
            <ArrowLeft className="h-4 w-4" aria-hidden />
            {t(defaultLocale, "bots.edit.backToList")}
          </Link>
        </Button>
        <BotStatusBadge status={bot.status} />
      </div>

      <PageHeader title={bot.name} description={t(defaultLocale, "bots.edit.description")} />

      <div className="grid gap-6 xl:grid-cols-[200px_minmax(0,1fr)_320px]">
        <nav
          aria-label="机器人设置导航"
          className="flex gap-2 overflow-x-auto rounded-card border border-border bg-card p-2 shadow-card xl:flex-col xl:overflow-visible xl:p-3"
        >
          {botEditNav.map((item) => {
            const Icon = item.icon;
            const active = item.id === activeSection;
            return (
              <Link
                key={item.id}
                href={item.href(bot.id)}
                className={cn(
                  "inline-flex shrink-0 items-center gap-2 rounded-control px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <Icon className="h-4 w-4" aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="min-w-0">{children}</div>

        <div className="xl:sticky xl:top-24 xl:self-start">
          <BotChatPreview bot={bot} />
        </div>
      </div>
    </div>
  );
}
