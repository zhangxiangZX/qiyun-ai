"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { fetchBotDetail } from "@/lib/bots/mock-data";
import type { BotDetail } from "@/lib/bots/types";

interface BotEditContextValue {
  bot: BotDetail | null;
  loading: boolean;
  error: boolean;
  saving: boolean;
  saveMessage: string | null;
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const detail = await fetchBotDetail(botId);
      if (!detail) {
        setError(true);
        setBot(null);
      } else {
        setBot(detail);
      }
    } catch {
      setError(true);
      setBot(null);
    } finally {
      setLoading(false);
    }
  }, [botId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const updateBot = useCallback((patch: Partial<BotDetail>) => {
    setBot((current) => (current ? { ...current, ...patch } : current));
    setSaveMessage(null);
  }, []);

  const saveBot = useCallback(async () => {
    if (!bot) return;
    setSaving(true);
    setSaveMessage(null);
    await new Promise((resolve) => window.setTimeout(resolve, 500));
    setSaving(false);
    setSaveMessage("设置已保存");
    updateBot({ updatedAt: new Date().toISOString() });
  }, [bot, updateBot]);

  const value = useMemo(
    () => ({
      bot,
      loading,
      error,
      saving,
      saveMessage,
      updateBot,
      saveBot,
      reload,
    }),
    [bot, loading, error, saving, saveMessage, updateBot, saveBot, reload],
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
