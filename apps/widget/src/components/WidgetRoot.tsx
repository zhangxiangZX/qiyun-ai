import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { streamPublicChat } from "../lib/chat-api";
import { submitPublicLead } from "../lib/leads-api";
import { loadWidgetSession, saveWidgetSession } from "../lib/session-storage";
import type { ChatMessage, WidgetConfig, WidgetConnectionState } from "../lib/types";
import { fetchPublicWidgetConfig } from "../lib/widget-config-api";
import { getOrCreateVisitorId } from "../lib/visitor";
import { ChatLauncher } from "./ChatLauncher";
import { ChatPanel } from "./ChatPanel";
import styles from "../styles/widget.module.css";

const LEAD_PROMPT_COOLDOWN_MS = 3 * 60 * 1000;

function createMessage(role: ChatMessage["role"], content: string): ChatMessage {
  return {
    id: `${role}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    role,
    content,
    status: "done",
  };
}

export function WidgetRoot({ config }: { config: WidgetConfig }) {
  const visitorId = useMemo(() => getOrCreateVisitorId(), []);
  const restoredSession = useMemo(() => loadWidgetSession(config.botId), [config.botId]);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>(() => restoredSession?.messages ?? []);
  const [connectionState, setConnectionState] = useState<WidgetConnectionState>("idle");
  const [statusMessage, setStatusMessage] = useState<string | undefined>();
  const [statusTone, setStatusTone] = useState<"info" | "error" | "success">("info");
  const [leadFields, setLeadFields] = useState<string[] | null>(null);
  const [followUpQuestions, setFollowUpQuestions] = useState<string[]>([]);
  const [leadSubmitting, setLeadSubmitting] = useState(false);
  const [leadError, setLeadError] = useState<string | undefined>();
  const [botDisplay, setBotDisplay] = useState({
    welcome: config.welcome,
    recommendedQuestions: [] as string[],
    botName: null as string | null,
  });
  const conversationIdRef = useRef(restoredSession?.conversationId ?? "");
  const welcomedRef = useRef(Boolean(restoredSession?.messages.length));
  const leadSubmittedRef = useRef(false);
  const lastLeadPromptAtRef = useRef<number | null>(null);
  const configFetchStartedRef = useRef(false);

  const hasUserMessage = messages.some((message) => message.role === "user");
  const showRecommendedQuestions =
    !hasUserMessage && botDisplay.recommendedQuestions.length > 0;

  useEffect(() => {
    if (!messages.length && !conversationIdRef.current) {
      return;
    }

    saveWidgetSession(config.botId, {
      conversationId: conversationIdRef.current,
      messages: messages.filter((message) => message.status !== "streaming"),
      updatedAt: Date.now(),
    });
  }, [config.botId, messages]);

  const loadBotConfig = useCallback(async () => {
    if (configFetchStartedRef.current) {
      return;
    }
    configFetchStartedRef.current = true;

    try {
      const remote = await fetchPublicWidgetConfig(config);
      const welcome = remote.welcomeMessage.trim() || config.welcome;
      setBotDisplay({
        welcome,
        recommendedQuestions: remote.recommendedQuestions,
        botName: remote.botName,
      });
      setMessages((current) => {
        if (
          current.length === 1 &&
          current[0]?.role === "assistant" &&
          current[0]?.status !== "streaming" &&
          !hasUserMessage
        ) {
          return [{ ...current[0], content: welcome }];
        }
        return current;
      });
    } catch {
      /* keep script fallback welcome */
    }
  }, [config, hasUserMessage]);

  const openPanel = useCallback(() => {
    setOpen(true);
    if (!welcomedRef.current) {
      welcomedRef.current = true;
      setMessages([createMessage("assistant", botDisplay.welcome)]);
    }
    void loadBotConfig();
  }, [botDisplay.welcome, loadBotConfig]);

  const handleLeadSubmit = useCallback(
    async (fields: Record<string, string>) => {
      if (!conversationIdRef.current) {
        setLeadError("会话尚未建立，请先发一条消息。");
        return;
      }

      setLeadSubmitting(true);
      setLeadError(undefined);

      try {
        await submitPublicLead({
          config,
          conversationId: conversationIdRef.current,
          fields,
        });
        leadSubmittedRef.current = true;
        setLeadFields(null);
        setStatusTone("success");
        setStatusMessage("已收到您的留资信息，工程师会尽快联系您。");
        setMessages((current) => [
          ...current,
          createMessage("assistant", "已收到您的留资信息，我们会安排工程师确认参数与报价。"),
        ]);
      } catch (error) {
        setLeadError(error instanceof Error ? error.message : "提交失败，请稍后重试。");
      } finally {
        setLeadSubmitting(false);
      }
    },
    [config],
  );

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      setDraft("");
      setFollowUpQuestions([]);
      setMessages((current) => [...current, createMessage("user", trimmed)]);

      const assistantId = `assistant_${Date.now()}`;
      setConnectionState("loading");
      setStatusMessage(undefined);
      setLeadError(undefined);
      setMessages((current) => [
        ...current.filter((item) => item.status !== "streaming"),
        {
          id: assistantId,
          role: "assistant",
          content: "",
          status: "streaming",
        },
      ]);

      try {
        setConnectionState("streaming");
        await streamPublicChat(
          {
            config,
            visitorId,
            conversationId: conversationIdRef.current || undefined,
            message: trimmed,
          },
          {
            onMeta: (conversationId) => {
              conversationIdRef.current = conversationId;
            },
            onToken: (content) => {
              setMessages((current) =>
                current.map((item) =>
                  item.id === assistantId ? { ...item, content, status: "streaming" } : item,
                ),
              );
            },
            onCitations: (items) => {
              setMessages((current) =>
                current.map((item) =>
                  item.id === assistantId ? { ...item, citations: items } : item,
                ),
              );
            },
            onDone: (payload) => {
              setFollowUpQuestions(payload.suggestedQuestions ?? []);
              setMessages((current) =>
                current.map((item) =>
                  item.id === assistantId
                    ? {
                        ...item,
                        content:
                          typeof payload.content === "string" && payload.content.trim()
                            ? payload.content
                            : item.content,
                        suggestedQuestions: payload.suggestedQuestions ?? [],
                        citations: payload.citations ?? item.citations,
                      }
                    : item,
                ),
              );
              if (payload.needsLeadCapture && !leadSubmittedRef.current) {
                const now = Date.now();
                const cooledDown =
                  !lastLeadPromptAtRef.current ||
                  now - lastLeadPromptAtRef.current >= LEAD_PROMPT_COOLDOWN_MS;
                if (cooledDown) {
                  lastLeadPromptAtRef.current = now;
                  setLeadFields(payload.leadFields ?? null);
                  setStatusTone("info");
                  setStatusMessage("请补充联系方式，便于工程师确认报价与图纸需求。");
                }
              }
            },
          },
        );

        setMessages((current) =>
          current.map((item) =>
            item.id === assistantId
              ? {
                  ...item,
                  content: item.content || "暂无回复",
                  status: "done",
                }
              : item,
          ),
        );
        setConnectionState("idle");
      } catch (error) {
        const message = error instanceof Error ? error.message : "网络错误，请稍后重试。";
        setMessages((current) =>
          current.map((item) =>
            item.id === assistantId
              ? { ...item, content: message, status: "error" }
              : item,
          ),
        );
        setConnectionState("error");
        setStatusTone("error");
        setStatusMessage(message);
      }
    },
    [config, visitorId],
  );

  return (
    <div className={styles.root}>
      <ChatPanel
        config={config}
        accent={config.accent}
        headerSubtitle={botDisplay.botName ?? "工业设备 · 产品咨询"}
        open={open}
        messages={messages}
        draft={draft}
        connectionState={connectionState}
        statusMessage={statusMessage}
        statusTone={statusTone}
        recommendedQuestions={botDisplay.recommendedQuestions}
        showRecommendedQuestions={showRecommendedQuestions}
        followUpQuestions={followUpQuestions}
        leadFields={leadFields}
        leadSubmitting={leadSubmitting}
        leadError={leadError}
        conversationId={conversationIdRef.current || undefined}
        onLeadSubmit={handleLeadSubmit}
        onLeadDismiss={() => {
          lastLeadPromptAtRef.current = Date.now();
          setLeadFields(null);
          setLeadError(undefined);
        }}
        onRecommendedQuestion={(question) => void sendMessage(question)}
        onClose={() => setOpen(false)}
        onDraftChange={setDraft}
        onSend={() => sendMessage(draft)}
      />
      {!open ? <ChatLauncher open={open} badge={0} accent={config.accent} onOpen={openPanel} /> : null}
    </div>
  );
}
