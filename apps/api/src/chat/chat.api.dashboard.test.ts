import assert from "node:assert/strict";
import test from "node:test";

import { PublicChatApi } from "./chat.api";
import type { ChatRepository } from "./chat.repository";
import type { RagRepository } from "../rag/rag.repository";
import type { ChatService } from "./chat.service";
import type { RequestContext } from "../workspace";

function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

const context: RequestContext = { userId: "u1", workspaceId: "ws1", role: "owner" };

function buildApi(overrides: {
  conversations?: Array<{ id: string; botId: string; visitorId: string; origin: string; createdAt: string }>;
  leads?: Array<{ id: string; createdAt: string; name: string }>;
  messagesByConversation?: Record<string, Array<{ role: "user" | "assistant"; content: string; createdAt: string }>>;
}) {
  const conversations = overrides.conversations ?? [];
  const leads = overrides.leads ?? [];
  const messagesByConversation = overrides.messagesByConversation ?? {};

  const chatRepository = {
    listConversationsByWorkspace: async () => conversations,
    listLeadsByWorkspace: async () => [],
    listMessagesByConversation: async (id: string) => messagesByConversation[id] ?? [],
    getConversationMeta: async () => null,
  } as unknown as ChatRepository;

  const ragRepository = {
    listBotsByWorkspace: async () => [{ id: "b1", name: "Demo Bot", workspaceId: "ws1", status: "active", knowledgeBaseIds: [], createdAt: daysAgoIso(40), updatedAt: daysAgoIso(40) }],
    findBotById: async () => ({ id: "b1", name: "Demo Bot", workspaceId: "ws1", status: "active", knowledgeBaseIds: [], createdAt: daysAgoIso(40), updatedAt: daysAgoIso(40) }),
  } as unknown as RagRepository;

  const service = {
    listLeads: async () =>
      leads.map((lead) => ({
        lead: {
          id: lead.id,
          workspaceId: "ws1",
          botId: "b1",
          conversationId: "c1",
          createdAt: lead.createdAt,
          fields: { name: lead.name, phone: "", email: "", company: "" },
          attachments: [],
        },
        meta: null,
        bot: { id: "b1", name: "Demo Bot", workspaceId: "ws1", status: "active", knowledgeBaseIds: [], createdAt: daysAgoIso(40), updatedAt: daysAgoIso(40) },
        messages: [],
      })),
  } as unknown as ChatService;

  return new PublicChatApi(service, chatRepository, ragRepository);
}

test("dashboard recentLeads are returned in recency-descending order", async () => {
  const api = buildApi({
    leads: [
      { id: "l_old", createdAt: daysAgoIso(20), name: "Old Lead" },
      { id: "l_mid", createdAt: daysAgoIso(10), name: "Mid Lead" },
      { id: "l_new", createdAt: daysAgoIso(1), name: "New Lead" },
    ],
    conversations: [
      { id: "c1", botId: "b1", visitorId: "v1", origin: "https://localhost", createdAt: daysAgoIso(2) },
    ],
    messagesByConversation: {
      c1: [{ role: "user", content: "pricing", createdAt: daysAgoIso(2) }],
    },
  });

  const snapshot = await api.getDashboardSnapshot(context);
  assert.equal(snapshot.hasBots, true);
  assert.equal(snapshot.recentLeads.length, 3);
  assert.equal(snapshot.recentLeads[0]?.id, "l_new");
  assert.equal(snapshot.recentLeads[1]?.id, "l_mid");
  assert.equal(snapshot.recentLeads[2]?.id, "l_old");
});

test("dashboard aggregation excludes conversations older than the 30-day default window", async () => {
  const api = buildApi({
    conversations: [
      { id: "c_recent", botId: "b1", visitorId: "v1", origin: "https://localhost", createdAt: daysAgoIso(2) },
      { id: "c_old", botId: "b1", visitorId: "v2", origin: "https://localhost", createdAt: daysAgoIso(60) },
    ],
    messagesByConversation: {
      c_recent: [{ role: "user", content: "pricing", createdAt: daysAgoIso(2) }],
      c_old: [{ role: "user", content: "old question", createdAt: daysAgoIso(60) }],
    },
  });

  const snapshot = await api.getDashboardSnapshot(context);
  const totalSessions30 = snapshot.trend30.reduce((sum, point) => sum + point.sessions, 0);
  const totalSessions7 = snapshot.trend7.reduce((sum, point) => sum + point.sessions, 0);

  // Only the conversation within the last 30 days should be counted.
  assert.equal(totalSessions30, 1);
  assert.equal(totalSessions7, 1);
  // The 60-day-old conversation must not surface as a frequent question.
  assert.ok(!snapshot.frequentQuestions.some((item) => item.question.includes("old question")));
});

test("dashboard returns empty payload when workspace has no bots", async () => {
  const chatRepository = {
    listConversationsByWorkspace: async () => [],
    listLeadsByWorkspace: async () => [],
    listMessagesByConversation: async () => [],
    getConversationMeta: async () => null,
  } as unknown as ChatRepository;
  const ragRepository = {
    listBotsByWorkspace: async () => [],
    findBotById: async () => null,
  } as unknown as RagRepository;
  const service = { listLeads: async () => [] } as unknown as ChatService;

  const api = new PublicChatApi(service, chatRepository, ragRepository);
  const snapshot = await api.getDashboardSnapshot(context);
  assert.equal(snapshot.hasBots, false);
  assert.equal(snapshot.kpis.length, 0);
  assert.equal(snapshot.recentLeads.length, 0);
});
