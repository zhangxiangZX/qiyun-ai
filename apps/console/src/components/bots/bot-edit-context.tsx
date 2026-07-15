"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { getApiErrorMessage } from "@/lib/api/errors";
import { canPersistBots, getBotDetail, saveBot as persistBot } from "@/lib/bots/data";
import { getBotsCapabilities } from "@/lib/bots/capabilities";
import { getSaveSuccessMessage } from "@/lib/console/mode-copy";
import type { BotDetail } from "@/lib/bots/types";
import { t } from "@/lib/i18n";
import { defaultLocale } from "@/lib/messages";
import { useOnWorkspaceChanged } from "@/lib/workspace-events";

export type BotLoadState = "loading" | "ready" | "not_found" | "error";

interface BotEditContextValue {
  bot: BotDetail | null;
  loading: boolean;
  loadState: BotLoadState;
  loadError: unknown;
  errorMessage: string | null;
  saving: boolean;
  saveMessage: string | null;
  saveError: string | null;
  persistenceEnabled: boolean;
  dataMode: "preview" | "upstream";
  extendedFieldsReadOnly: boolean;
  extendedFieldsReadOnlyReason?: string;
  updateBot: (patch: Partial<BotDetail>) => void;
  saveBot: () => Promise<void>;
  reload: () => Promise<void>;
}

const BotEditContext = createContext<BotEditContextValue | null>(null);

export function BotEditProvider({
  botId,
  children,
}: {
  botId: string;
  children: React.ReactNode;
}) {
  const [bot, setBot] = useState<BotDetail | null>(null);
  const [loadState, setLoadState] = useState<BotLoadState>("loading");
  const [loadError, setLoadError] = useState<unknown>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [persistenceEnabled, setPersistenceEnabled] = useState(true);
  const [dataMode, setDataMode] = useState<"preview" | "upstream">("preview");
  const [extendedFieldsReadOnly, setExtendedFieldsReadOnly] = useState(false);
  const [extendedFieldsReadOnlyReason, setExtendedFieldsReadOnlyReason] = useState<
    string | undefined
  >(undefined);

  const reload = useCallback(async () => {
    setLoadState("loading");
    setLoadError(null);
    setErrorMessage(null);
    try {
      const [detail, canPersist, capabilities] = await Promise.all([
        getBotDetail(botId),
        canPersistBots(),
        getBotsCapabilities(),
      ]);
      setPersistenceEnabled(canPersist);
      setDataMode(capabilities.dataMode);
      setExtendedFieldsReadOnly(
        capabilities.dataMode === "upstream" && !capabilities.canPersistExtendedFields,
      );
      setExtendedFieldsReadOnlyReason(capabilities.extendedFieldsReadOnlyReason);
      if (!detail) {
        setBot(null);
        setLoadState("not_found");
      } else {
        setBot(detail);
        setLoadState("ready");
      }
    } catch (error) {
      setBot(null);
      setLoadState("error");
      setLoadError(error);
      setErrorMessage(
        getApiErrorMessage(error, t(defaultLocale, "bots.edit.loadError")),
      );
    }
  }, [botId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useOnWorkspaceChanged(() => {
    void reload();
  });

  const updateBot = useCallback((patch: Partial<BotDetail>) => {
    setBot((current) => (current ? { ...current, ...patch } : current));
    setSaveMessage(null);
    setSaveError(null);
  }, []);

  const saveBot = useCallback(async () => {
    if (!bot) return;
    setSaving(true);
    setSaveMessage(null);
    setSaveError(null);
    try {
      const updated = await persistBot(bot);
      setBot(updated);
      setSaveMessage(getSaveSuccessMessage(dataMode, "bot"));
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }, [bot, dataMode]);

  const value = useMemo(
    () => ({
      bot,
      loading: loadState === "loading",
      loadState,
      loadError,
      errorMessage,
      saving,
      saveMessage,
      saveError,
      persistenceEnabled,
      dataMode,
      extendedFieldsReadOnly,
      extendedFieldsReadOnlyReason,
      updateBot,
      saveBot,
      reload,
    }),
    [
      bot,
      loadState,
      loadError,
      errorMessage,
      saving,
      saveMessage,
      saveError,
      persistenceEnabled,
      dataMode,
      extendedFieldsReadOnly,
      extendedFieldsReadOnlyReason,
      updateBot,
      saveBot,
      reload,
    ],
  );

  return <BotEditContext.Provider value={value}>{children}</BotEditContext.Provider>;
}

export function useBotEdit() {
  const context = useContext(BotEditContext);
  if (!context) {
    throw new Error("useBotEdit must be used within BotEditProvider");
  }
  return context;
}
