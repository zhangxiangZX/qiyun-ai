"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bot, Plus } from "lucide-react";

import { Alert, Button, EmptyState, PageHeader, Skeleton } from "@qiyun/ui";

import { BotList } from "@/components/bots/bot-list";
import { CreateBotDialog } from "@/components/bots/create-bot-dialog";
import { createBotDraft, fetchBots } from "@/lib/bots/mock-data";
import type { BotListItem } from "@/lib/bots/types";
import { t } from "@/lib/i18n";
import { defaultLocale } from "@/lib/messages";

type LoadState = "loading" | "ready" | "error";

export function BotsWorkspace() {
  const router = useRouter();
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [bots, setBots] = useState<BotListItem[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadBots = useCallback(async () => {
    setLoadState("loading");
    try {
      const data = await fetchBots();
      setBots(data);
      setLoadState("ready");
    } catch {
      setLoadState("error");
    }
  }, []);

  useEffect(() => {
    void loadBots();
  }, [loadBots]);

  function handleCreate(name: string) {
    setCreating(true);
    window.setTimeout(() => {
      const draft = createBotDraft(name);
      setCreating(false);
      setDialogOpen(false);
      setSuccessMessage(`机器人「${name}」已创建`);
      router.push(`/dashboard/bots/${draft.id}/basics`);
    }, 400);
  }

  if (loadState === "loading") {
    return (
      <div className="space-y-6">
        <PageHeader
          title={t(defaultLocale, "bots.list.title")}
          description={t(defaultLocale, "bots.list.description")}
        />
        <div className="space-y-3 px-4 sm:px-6 lg:px-page">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-64 rounded-card" />
        </div>
      </div>
    );
  }

  if (loadState === "error") {
    return (
      <div className="space-y-6">
        <PageHeader
          title={t(defaultLocale, "bots.list.title")}
          description={t(defaultLocale, "bots.list.description")}
        />
        <div className="space-y-4 px-4 sm:px-6 lg:px-page">
          <Alert variant="error" title={t(defaultLocale, "bots.list.error")} />
          <Button variant="outline" size="sm" onClick={() => void loadBots()}>
            {t(defaultLocale, "dashboard.error.retry")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t(defaultLocale, "bots.list.title")}
        description={t(defaultLocale, "bots.list.description")}
        actions={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" aria-hidden />
            {t(defaultLocale, "bots.list.create")}
          </Button>
        }
      />

      <div className="space-y-4 px-4 sm:px-6 lg:px-page">
        {successMessage ? <Alert variant="success" title={successMessage} /> : null}

        {bots.length ? (
          <BotList bots={bots} />
        ) : (
          <EmptyState
            icon={<Bot className="h-8 w-8" aria-hidden />}
            title={t(defaultLocale, "bots.list.empty.title")}
            description={t(defaultLocale, "bots.list.empty.description")}
            action={
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4" aria-hidden />
                {t(defaultLocale, "bots.list.empty.action")}
              </Button>
            }
          />
        )}
      </div>

      <CreateBotDialog
        open={dialogOpen}
        loading={creating}
        onClose={() => setDialogOpen(false)}
        onCreate={handleCreate}
      />
    </div>
  );
}
