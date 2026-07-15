import assert from "node:assert/strict";
import test from "node:test";

import { hasDashboardActivity, hasReportActivity } from "@/lib/analytics/activity";
import { dashboardWithBots } from "@/lib/dashboard/mock-data";
import { fetchReportSnapshot } from "@/lib/reports/mock-data";
import { applyConversationFilters } from "@/lib/conversations/api";
import { applyLeadFilters } from "@/lib/leads/api";
import type { ConversationListItem } from "@/lib/conversations/types";
import type { LeadListItem } from "@/lib/leads/types";
import { listBots } from "@/lib/bots/data";
import { listAllLeads } from "@/lib/leads/data";
import { jsonResponse, previewModeInfo, upstreamModeInfo, withFetchMock } from "@/lib/test/console-fetch-mock";

test("feature: dashboard activity detection gates success vs empty-no-activity", () => {
  assert.equal(hasDashboardActivity(dashboardWithBots), true);
});

test("feature: reports activity detection gates analytics empty state", async () => {
  const snapshot = await fetchReportSnapshot();
  assert.equal(hasReportActivity(snapshot), true);
});

test("feature: conversations filters support search and unresolved-only views", () => {
  const items: ConversationListItem[] = [
    {
      id: "c1",
      visitorLabel: "Alice",
      summary: "pricing question",
      botId: "bot_1",
      botName: "Support",
      status: "unresolved",
      hasLead: false,
      highIntent: true,
      aiIntentLabel: "报价意向",
      createdAt: "2026-07-01T09:00:00.000Z",
      updatedAt: "2026-07-01T10:00:00.000Z",
    },
    {
      id: "c2",
      visitorLabel: "Bob",
      summary: "thanks",
      botId: "bot_2",
      botName: "Sales",
      status: "resolved",
      hasLead: true,
      highIntent: false,
      aiIntentLabel: null,
      createdAt: "2026-07-02T09:00:00.000Z",
      updatedAt: "2026-07-02T10:00:00.000Z",
    },
  ];

  assert.equal(
    applyConversationFilters(items, {
      query: "pricing",
      botId: "all",
      hasLead: false,
      unresolvedOnly: false,
    }).length,
    1,
  );
  assert.equal(
    applyConversationFilters(items, {
      query: "",
      botId: "all",
      hasLead: false,
      unresolvedOnly: true,
    }).length,
    1,
  );
});

test("feature: leads filters support status and assignee views", () => {
  const items: LeadListItem[] = [
    {
      id: "l1",
      name: "Acme",
      contact: "a@acme.com",
      sourceBotId: "bot_1",
      sourceBot: "Support",
      lastQuestion: "Need quote",
      status: "new",
      assignee: null,
      createdAt: "2026-07-01T10:00:00.000Z",
      updatedAt: "2026-07-01T10:00:00.000Z",
    },
    {
      id: "l2",
      name: "Beta",
      contact: "b@beta.com",
      sourceBotId: "bot_2",
      sourceBot: "Sales",
      lastQuestion: "Demo",
      status: "pending",
      assignee: "Alice",
      createdAt: "2026-07-02T10:00:00.000Z",
      updatedAt: "2026-07-02T10:00:00.000Z",
    },
  ];

  assert.equal(
    applyLeadFilters(items, { query: "", status: "new", botId: "all", assignee: "all" }).length,
    1,
  );
  assert.equal(
    applyLeadFilters(items, { query: "", status: "all", botId: "all", assignee: "unassigned" })
      .length,
    1,
  );
});

test("feature: bots list uses preview data without upstream", async () => {
  await withFetchMock(
    (url) => {
      if (url.includes("/console/mode")) return jsonResponse(previewModeInfo);
      return jsonResponse({ code: "NOT_FOUND" }, 404);
    },
    async () => {
      const bots = await listBots();
      assert.ok(bots.length > 0);
    },
  );
});

test("feature: leads list uses preview data without upstream", async () => {
  await withFetchMock(
    (url) => {
      if (url.includes("/console/mode")) return jsonResponse(previewModeInfo);
      return jsonResponse({ code: "NOT_FOUND" }, 404);
    },
    async () => {
      const leads = await listAllLeads();
      assert.ok(Array.isArray(leads));
    },
  );
});

test("feature: bots list surfaces upstream failures", async () => {
  await withFetchMock(
    (url) => {
      if (url.includes("/console/mode")) return jsonResponse(upstreamModeInfo);
      if (url.endsWith("/api/bots")) {
        return jsonResponse({ code: "INTERNAL_ERROR", message: "Upstream down." }, 500);
      }
      return jsonResponse({ code: "NOT_FOUND" }, 404);
    },
    async () => {
      await assert.rejects(() => listBots());
    },
  );
});
