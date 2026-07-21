"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Button, PageHeader, Skeleton, cn } from "@qiyun/ui";

import { BotChatPreviewBoundary } from "@/components/bots/bot-chat-preview-boundary";
import { useBotEdit } from "@/components/bots/bot-edit-context";
import { BotStatusBadge } from "@/components/bots/bot-status-badge";
import {
  ConsoleDataModeBanner,
  ConsoleModeBadge,
} from "@/components/console/console-data-mode-banner";
import {
  ConsolePage,
  ConsolePageAlerts,
  ConsolePageSection,
} from "@/components/console/console-page-shell";
import { ConsoleReadOnlyNotice } from "@/components/console/console-read-only-notice";
import { ConsoleEmptyState } from "@/components/console/console-empty-catalog";
import {
  ConsoleRequestError,
  resolveRequestErrorPresentation,
} from "@/components/console/console-request-error";
import { botEditNav, getBotEditSection } from "@/lib/bots/navigation";
import { getBotsReadOnlyNotice } from "@/lib/console/mode-copy";
import { t } from "@/lib/i18n";
import { defaultLocale } from "@/lib/messages";

const BotChatPreview = dynamic(() => import("@/components/bots/bot-chat-preview"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-[420px] flex-col gap-3 rounded-card border border-border bg-card p-4 shadow-card">
      <Skeleton className="h-5 w-28" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-3/4" />
      <Skeleton className="mt-auto h-11 w-full" />
    </div>
  ),
});

export function BotEditShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const {
    bot,
    loading,
    loadState,
    loadError,
    errorMessage,
    reload,
    extendedFieldsReadOnly,
    extendedFieldsReadOnlyReason,
    persistenceEnabled,
  } = useBotEdit();
  const activeSection = getBotEditSection(pathname);

  if (loading) {
    return (
      <ConsolePage>
        <Skeleton className="h-8 w-48" />
        <ConsoleDataModeBanner feature="机器人编辑" />
        <div className="grid gap-6 xl:grid-cols-[200px_minmax(0,1fr)_320px]">
          <Skeleton className="h-64 rounded-card" />
          <Skeleton className="h-96 rounded-card" />
          <Skeleton className="h-96 rounded-card" />
        </div>
      </ConsolePage>
    );
  }

  if (loadState === "not_found") {
    return (
      <ConsolePage>
        <ConsolePageAlerts>
          <ConsoleDataModeBanner feature="机器人编辑" />
          <ConsoleEmptyState
            preset="noBots"
            title={t(defaultLocale, "bots.edit.notFound")}
            description={t(defaultLocale, "bots.edit.notFoundHint")}
            action={
              <Button variant="outline" size="sm" className="min-h-11" asChild>
                <Link href="/dashboard/bots">{t(defaultLocale, "bots.edit.backToList")}</Link>
              </Button>
            }
          />
        </ConsolePageAlerts>
      </ConsolePage>
    );
  }

  if (loadState === "error") {
    const { kind, message } = resolveRequestErrorPresentation(
      loadError,
      errorMessage ?? t(defaultLocale, "bots.edit.loadError"),
    );

    return (
      <ConsolePage>
        <ConsolePageAlerts>
          <ConsoleDataModeBanner feature="机器人编辑" />
          <ConsoleRequestError
            kind={kind}
            message={message}
            onRetry={() => void reload()}
            retryLabel={t(defaultLocale, "dashboard.error.retry")}
          />
        </ConsolePageAlerts>
        <Button variant="outline" size="sm" className="min-h-11" asChild>
          <Link href="/dashboard/bots">{t(defaultLocale, "bots.edit.backToList")}</Link>
        </Button>
      </ConsolePage>
    );
  }

  if (!bot) {
    return null;
  }

  return (
    <ConsolePage>
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/bots">
            <ArrowLeft className="h-4 w-4" aria-hidden />
            {t(defaultLocale, "bots.edit.backToList")}
          </Link>
        </Button>
        <BotStatusBadge status={bot.status} />
      </div>

      <PageHeader
        variant="compact"
        title={bot.name}
        description={t(defaultLocale, "bots.edit.description")}
        actions={<ConsoleModeBadge />}
      />

      <ConsolePageAlerts>
        <ConsoleDataModeBanner feature="机器人编辑" />
        {!persistenceEnabled ? (
          <ConsoleReadOnlyNotice description={getBotsReadOnlyNotice("edit")} />
        ) : null}
        {extendedFieldsReadOnly && extendedFieldsReadOnlyReason ? (
          <ConsoleReadOnlyNotice
            title="扩展配置只读"
            description={extendedFieldsReadOnlyReason}
          />
        ) : null}
      </ConsolePageAlerts>

      <ConsolePageSection className="grid gap-6 max-xl:[&>*:nth-child(3)]:order-first xl:grid-cols-[200px_minmax(0,1fr)_320px]">
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
                  "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-control px-3 py-2 text-sm font-medium transition-colors",
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
          <BotChatPreviewBoundary>
            <BotChatPreview bot={bot} />
          </BotChatPreviewBoundary>
        </div>
      </ConsolePageSection>
    </ConsolePage>
  );
}
