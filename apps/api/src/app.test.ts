import test from "node:test";
import assert from "node:assert/strict";

import { handleApiRequest as rawHandleApiRequest } from "./app";
import { query as pgQuery } from "./db/pg";
import {
  listMemoryQueuedJobsForTests,
  resetDocumentDeadLetterQueueForTests,
  seedDeadLetterJobForTests,
} from "./documents/document-dead-letter-queue";
import { executeDocumentJob } from "./documents/document-job-runner";
import { resetRateLimitsForTests } from "./http/rate-limit";
import { resetNestContextForTests } from "./nest/bootstrap";
import { getRuntime, resetRuntimeForTests } from "./runtime";

const jsonHeaders = {
  "content-type": "application/json",
};

/**
 * Test harness adapter for the unified response envelope.
 *
 * After the P3 envelope migration every successful API response is wrapped as
 * `{ code, message, data }`. The production handler (`handleApiRequest`) returns
 * that envelope as-is, and the frontend unwraps `data` at the fetch layer. This
 * adapter restores the pre-envelope test ergonomics: `.json()` yields the
 * unwrapped `data` payload while `.status` keeps the real HTTP status (200 for
 * creates — the envelope does not use 201).
 */
class EnvelopeResponse {
  private cachedJson: Promise<unknown> | null = null;

  constructor(private readonly inner: Response) {}

  get status(): number {
    return this.inner.status;
  }

  get headers(): Headers {
    return this.inner.headers;
  }

  json(): Promise<unknown> {
    if (!this.cachedJson) {
      this.cachedJson = this.inner.json().then((body) => {
        if (body && typeof body === "object" && "data" in body) {
          return (body as { data: unknown }).data;
        }
        return body;
      });
    }
    return this.cachedJson;
  }

  text(): Promise<string> {
    return this.inner.text();
  }

  arrayBuffer(): Promise<ArrayBuffer> {
    return this.inner.arrayBuffer();
  }
}

async function handleApiRequest(request: Request): Promise<EnvelopeResponse> {
  return new EnvelopeResponse(await rawHandleApiRequest(request));
}

let accountCounter = 0;

async function resetPostgresTestData() {
  await pgQuery(
    `truncate table
       site_key_audits,
       quote_public_links,
       quote_follow_ups,
       quote_opportunities,
       quote_templates,
       inquiries,
       source_codes,
       business_rules,
       leads,
       messages,
       conversations,
       sites,
       document_chunks,
       documents,
       bots,
       trial_requests,
       email_login_codes,
       knowledge_bases,
       refresh_sessions,
       workspace_invitations,
       workspace_members,
       workspaces,
       users,
       runtime_state
     restart identity cascade`,
  );
}

async function resetTestState() {
  process.env.NODE_ENV = "test";
  resetRateLimitsForTests();
  resetDocumentDeadLetterQueueForTests();
  resetRuntimeForTests();
  await resetNestContextForTests();
  if (process.env.API_RUNTIME_DRIVER === "postgres") {
    await resetPostgresTestData();
  }
}

async function waitFor<T>(
  load: () => Promise<T>,
  predicate: (value: T) => boolean,
  timeoutMs = 1000,
): Promise<T> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const value = await load();
    if (predicate(value)) {
      return value;
    }

    await new Promise((resolve) => setTimeout(resolve, 25));
  }

  throw new Error("Condition not met before timeout.");
}

async function registerAndLogin() {
  accountCounter += 1;
  const email = `owner${accountCounter}@example.com`;
  const registerResponse = await handleApiRequest(
    new Request("http://localhost:3001/auth/register", {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({
        email,
        password: "secret123",
        name: "Owner",
        workspaceName: "Owner Workspace",
      }),
    }),
  );
  assert.equal(registerResponse.status, 200);
  const registered = (await registerResponse.json()) as {
    tokens: { accessToken: string; refreshToken: string };
    user: { activeWorkspaceId: string | null };
  };
  return registered;
}

async function createBotAndSite(accessToken: string) {
  const headers = {
    ...jsonHeaders,
    authorization: `Bearer ${accessToken}`,
  };

  const botResponse = await handleApiRequest(
    new Request("http://localhost:3001/bots", {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: "Support Bot",
        status: "active",
        knowledgeBaseIds: [],
      }),
    }),
  );
  assert.equal(botResponse.status, 200);
  const bot = (await botResponse.json()) as { id: string };

  const siteResponse = await handleApiRequest(
    new Request("http://localhost:3001/sites", {
      method: "POST",
      headers,
      body: JSON.stringify({
        botId: bot.id,
        name: "Primary Site",
        allowedDomains: ["localhost"],
      }),
    }),
  );
  assert.equal(siteResponse.status, 200);
  const sitePayload = (await siteResponse.json()) as {
    site: { id: string; siteKeyPrefix: string };
    revealedSiteKey: string;
  };
  const site = { id: sitePayload.site.id, siteKey: sitePayload.revealedSiteKey };

  return { bot, site, headers };
}

async function createWorkspaceInvite(
  accessToken: string,
  body: {
    email: string;
    role: "admin" | "member" | "sales_member" | "viewer" | "workspace_admin";
  },
) {
  const response = await handleApiRequest(
    new Request("http://localhost:3001/workspace-invitations", {
      method: "POST",
      headers: {
        ...jsonHeaders,
        authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    }),
  );
  return response;
}

async function registerUser(email: string, name: string) {
  const registerResponse = await handleApiRequest(
    new Request("http://localhost:3001/auth/register", {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({
        email,
        password: "secret123",
        name,
        workspaceName: `${name} Home`,
      }),
    }),
  );
  assert.equal(registerResponse.status, 200);
  return (await registerResponse.json()) as {
    tokens: { accessToken: string; refreshToken: string };
    user: { id: string; activeWorkspaceId: string | null };
  };
}

async function requestEmailLoginCode(email: string) {
  const response = await handleApiRequest(
    new Request("http://localhost:3001/auth/code/request", {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({ email }),
    }),
  );
  return response;
}

async function requestPasswordResetCode(email: string) {
  const response = await handleApiRequest(
    new Request("http://localhost:3001/auth/password-reset/request", {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({ email }),
    }),
  );
  return response;
}

test("knowledge base CRUD works end to end", { concurrency: false }, async () => {
  await resetTestState();
  const auth = await registerAndLogin();
  const workspaceHeaders = {
    ...jsonHeaders,
    authorization: `Bearer ${auth.tokens.accessToken}`,
  };

  const createResponse = await handleApiRequest(
    new Request("http://localhost:3001/knowledge-bases", {
      method: "POST",
      headers: workspaceHeaders,
      body: JSON.stringify({ name: "Operations Docs" }),
    }),
  );
  assert.equal(createResponse.status, 200);
  const created = (await createResponse.json()) as { id: string; name: string };
  assert.equal(created.name, "Operations Docs");

  const listResponse = await handleApiRequest(
    new Request("http://localhost:3001/knowledge-bases", {
      headers: workspaceHeaders,
    }),
  );
  assert.equal(listResponse.status, 200);
  const list = (await listResponse.json()) as Array<{ id: string }>;
  assert.ok(list.some((item) => item.id === created.id));
});

test("conversation patch persists status and tags", { concurrency: false }, async () => {
  await resetTestState();
  const auth = await registerAndLogin();
  const { bot, site, headers: workspaceHeaders } = await createBotAndSite(
    auth.tokens.accessToken,
  );

  const publicResponse = await handleApiRequest(
    new Request("http://localhost:3001/public/chat/stream", {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({
        botId: bot.id,
        siteKey: site.siteKey,
        visitorId: "visitor-test-1",
        sdkVersion: "1.0.0",
        origin: "http://localhost:3000",
        message: "Tell me more about your pricing.",
      }),
    }),
  );
  assert.equal(publicResponse.status, 200);

  const listResponse = await handleApiRequest(
    new Request("http://localhost:3001/conversations", {
      headers: workspaceHeaders,
    }),
  );
  const list = (await listResponse.json()) as Array<{ id: string }>;
  const conversationId = list[0]?.id;
  assert.ok(conversationId);

  const patchResponse = await handleApiRequest(
    new Request(`http://localhost:3001/conversations/${conversationId}`, {
      method: "PATCH",
      headers: workspaceHeaders,
      body: JSON.stringify({
        status: "resolved",
        tags: ["pricing", "vip"],
        assignee: "Mia",
      }),
    }),
  );
  assert.equal(patchResponse.status, 200);
  const detail = (await patchResponse.json()) as {
    status: string;
    tags: string[];
    assignee: string | null;
  };
  assert.equal(detail.status, "resolved");
  assert.deepEqual(detail.tags, ["pricing", "vip"]);
  assert.equal(detail.assignee, "Mia");
});

test("public chat stream returns SSE events", { concurrency: false }, async () => {
  await resetTestState();
  const auth = await registerAndLogin();
  const { bot, site } = await createBotAndSite(auth.tokens.accessToken);
  const response = await handleApiRequest(
    new Request("http://localhost:3001/public/chat/stream", {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({
        botId: bot.id,
        siteKey: site.siteKey,
        visitorId: "visitor-3003",
        sdkVersion: "1.0.0",
        origin: "http://localhost:3000",
        message: "What deployment options do you support?",
      }),
    }),
  );
  assert.equal(response.status, 200);
  assert.equal(
    response.headers.get("content-type"),
    "text/event-stream; charset=utf-8",
  );
  const text = await response.text();
  assert.match(text, /event: meta/);
  assert.match(text, /event: retrieval/);
  assert.match(text, /"sdkVersion":"1\.0\.0"/);
  assert.match(text, /event: citations/);
  assert.match(text, /event: done/);
});

test("public chat rejects unauthorized origin with DOMAIN_NOT_ALLOWED", { concurrency: false }, async () => {
  await resetTestState();
  const auth = await registerAndLogin();
  const { bot, site } = await createBotAndSite(auth.tokens.accessToken);

  const response = await handleApiRequest(
    new Request("http://localhost:3001/public/chat/stream", {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({
        botId: bot.id,
        siteKey: site.siteKey,
        visitorId: "visitor-blocked",
        sdkVersion: "1.0.0",
        origin: "https://evil.example.com",
        message: "hello",
      }),
    }),
  );

  assert.equal(response.status, 403);
  const body = (await response.json()) as { code: string };
  assert.equal(body.code, "DOMAIN_NOT_ALLOWED");
});

test("public chat rejects hostname substring bypass origins", { concurrency: false }, async () => {
  await resetTestState();
  const auth = await registerAndLogin();
  const { bot, site } = await createBotAndSite(auth.tokens.accessToken);

  const response = await handleApiRequest(
    new Request("http://localhost:3001/public/chat/stream", {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({
        botId: bot.id,
        siteKey: site.siteKey,
        visitorId: "visitor-bypass",
        sdkVersion: "1.0.0",
        origin: "https://localhost.evil.example.com",
        message: "hello",
      }),
    }),
  );

  assert.equal(response.status, 403);
  const body = (await response.json()) as { code: string };
  assert.equal(body.code, "DOMAIN_NOT_ALLOWED");
});

test("public leads rejects unauthorized origin via Origin header", { concurrency: false }, async () => {
  await resetTestState();
  const auth = await registerAndLogin();
  const { bot, site } = await createBotAndSite(auth.tokens.accessToken);

  const chatResponse = await handleApiRequest(
    new Request("http://localhost:3001/public/chat/stream", {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({
        botId: bot.id,
        siteKey: site.siteKey,
        visitorId: "visitor-lead-origin",
        sdkVersion: "1.0.0",
        origin: "http://localhost:3000",
        message: "I need a quote.",
      }),
    }),
  );
  assert.equal(chatResponse.status, 200);
  const eventText = await chatResponse.text();
  const metaLine = eventText
    .split("\n")
    .find((line) => line.startsWith("data: {\"conversationId\""));
  const conversationId = metaLine
    ? (JSON.parse(metaLine.replace("data: ", "")) as { conversationId: string }).conversationId
    : "";
  assert.ok(conversationId);

  const blocked = await handleApiRequest(
    new Request("http://localhost:3001/public/leads", {
      method: "POST",
      headers: { ...jsonHeaders, origin: "https://evil.example.com" },
      body: JSON.stringify({
        botId: bot.id,
        siteKey: site.siteKey,
        conversationId,
        fields: { name: "Evil", email: "evil@example.com" },
      }),
    }),
  );
  assert.equal(blocked.status, 403);
  const blockedBody = (await blocked.json()) as { code: string };
  assert.equal(blockedBody.code, "DOMAIN_NOT_ALLOWED");
});

test("public chat marks high-intent quote requests for lead capture", { concurrency: false }, async () => {
  await resetTestState();
  const auth = await registerAndLogin();
  const { bot, site } = await createBotAndSite(auth.tokens.accessToken);

  const response = await handleApiRequest(
    new Request("http://localhost:3001/public/chat/stream", {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({
        botId: bot.id,
        siteKey: site.siteKey,
        visitorId: "visitor-quote",
        sdkVersion: "1.0.0",
        origin: "http://localhost:3000",
        message: "这套设备报价是多少？",
      }),
    }),
  );

  assert.equal(response.status, 200);
  const text = await response.text();
  assert.match(text, /"needsLeadCapture":true/);
  assert.match(text, /"leadFields"/);
});

test("conversation detail exposes ai insight and repeated high-intent turns escalate lead capture", { concurrency: false }, async () => {
  await resetTestState();
  const auth = await registerAndLogin();
  const { bot, site, headers: workspaceHeaders } = await createBotAndSite(
    auth.tokens.accessToken,
  );

  const firstResponse = await handleApiRequest(
    new Request("http://localhost:3001/public/chat/stream", {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({
        botId: bot.id,
        siteKey: site.siteKey,
        visitorId: "visitor-follow-up",
        sdkVersion: "1.0.0",
        origin: "http://localhost:3000",
        message: "这套机柜空调现在怎么报价？",
      }),
    }),
  );
  assert.equal(firstResponse.status, 200);
  const firstText = await firstResponse.text();
  const firstMetaLine = firstText
    .split("\n")
    .find((line) => line.startsWith("data: {\"conversationId\""));
  const conversationId = firstMetaLine
    ? (JSON.parse(firstMetaLine.replace("data: ", "")) as { conversationId: string }).conversationId
    : "";
  assert.ok(conversationId);

  const secondResponse = await handleApiRequest(
    new Request("http://localhost:3001/public/chat/stream", {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({
        botId: bot.id,
        siteKey: site.siteKey,
        visitorId: "visitor-follow-up",
        conversationId,
        sdkVersion: "1.0.0",
        origin: "http://localhost:3000",
        message: "如果这个月下单，交期大概多久？",
      }),
    }),
  );
  assert.equal(secondResponse.status, 200);
  const secondText = await secondResponse.text();
  assert.match(secondText, /"needsLeadCapture":true/);

  const detailResponse = await handleApiRequest(
    new Request(`http://localhost:3001/conversations/${conversationId}`, {
      headers: workspaceHeaders,
    }),
  );
  assert.equal(detailResponse.status, 200);
  const detail = (await detailResponse.json()) as {
    aiInsight: {
      intent: string | null;
      highIntentTurnCount: number;
      suggestedQuestions: string[];
      leadCaptureRecommended: boolean;
    } | null;
  };
  assert.ok(detail.aiInsight);
  assert.ok(detail.aiInsight?.intent);
  assert.equal(detail.aiInsight?.highIntentTurnCount, 2);
  assert.equal(Array.isArray(detail.aiInsight?.suggestedQuestions), true);
  assert.equal((detail.aiInsight?.suggestedQuestions.length ?? 0) > 0, true);
  assert.equal(typeof detail.aiInsight?.leadCaptureRecommended, "boolean");
});

test("non-high-intent turn resets high-intent streak before the next escalation", { concurrency: false }, async () => {
  await resetTestState();
  const auth = await registerAndLogin();
  const { bot, site, headers: workspaceHeaders } = await createBotAndSite(
    auth.tokens.accessToken,
  );

  const firstResponse = await handleApiRequest(
    new Request("http://localhost:3001/public/chat/stream", {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({
        botId: bot.id,
        siteKey: site.siteKey,
        visitorId: "visitor-streak-reset",
        sdkVersion: "1.0.0",
        origin: "http://localhost:3000",
        message: "这套设备怎么报价？",
      }),
    }),
  );
  assert.equal(firstResponse.status, 200);
  const firstText = await firstResponse.text();
  const metaLine = firstText
    .split("\n")
    .find((line) => line.startsWith("data: {\"conversationId\""));
  const conversationId = metaLine
    ? (JSON.parse(metaLine.replace("data: ", "")) as { conversationId: string }).conversationId
    : "";
  assert.ok(conversationId);

  const neutralResponse = await handleApiRequest(
    new Request("http://localhost:3001/public/chat/stream", {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({
        botId: bot.id,
        siteKey: site.siteKey,
        visitorId: "visitor-streak-reset",
        conversationId,
        sdkVersion: "1.0.0",
        origin: "http://localhost:3000",
        message: "你们公司主要做什么？",
      }),
    }),
  );
  assert.equal(neutralResponse.status, 200);

  const secondHighIntentResponse = await handleApiRequest(
    new Request("http://localhost:3001/public/chat/stream", {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({
        botId: bot.id,
        siteKey: site.siteKey,
        visitorId: "visitor-streak-reset",
        conversationId,
        sdkVersion: "1.0.0",
        origin: "http://localhost:3000",
        message: "如果下单，交期多久？",
      }),
    }),
  );
  assert.equal(secondHighIntentResponse.status, 200);
  const secondHighIntentText = await secondHighIntentResponse.text();
  assert.doesNotMatch(secondHighIntentText, /"needsLeadCapture":true/);

  const detailResponse = await handleApiRequest(
    new Request(`http://localhost:3001/conversations/${conversationId}`, {
      headers: workspaceHeaders,
    }),
  );
  assert.equal(detailResponse.status, 200);
  const detail = (await detailResponse.json()) as {
    aiInsight: {
      highIntentTurnCount: number;
    } | null;
  };
  assert.equal(detail.aiInsight?.highIntentTurnCount, 1);
});

test("lead update works through formal API", { concurrency: false }, async () => {
  await resetTestState();
  const auth = await registerAndLogin();
  const { bot, site, headers: workspaceHeaders } = await createBotAndSite(
    auth.tokens.accessToken,
  );

  const chatResponse = await handleApiRequest(
    new Request("http://localhost:3001/public/chat/stream", {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({
        botId: bot.id,
        siteKey: site.siteKey,
        visitorId: "visitor-test-2",
        sdkVersion: "1.0.0",
        origin: "http://localhost:3000",
        message: "I want a product demo.",
      }),
    }),
  );
  assert.equal(chatResponse.status, 200);
  const eventText = await chatResponse.text();
  const metaLine = eventText
    .split("\n")
    .find((line) => line.startsWith("data: {\"conversationId\""));
  const conversationId = metaLine
    ? (JSON.parse(metaLine.replace("data: ", "")) as { conversationId: string }).conversationId
    : "";
  assert.ok(conversationId);

  const leadCreateResponse = await handleApiRequest(
    new Request("http://localhost:3001/public/leads", {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({
        botId: bot.id,
        siteKey: site.siteKey,
        conversationId,
        fields: {
          name: "Lead Tester",
          email: "lead@example.com",
          company: "Acme Equipment",
          requirement: "需要工业冷水机报价",
        },
      }),
    }),
  );
  assert.equal(leadCreateResponse.status, 200);

  const listResponse = await handleApiRequest(
    new Request("http://localhost:3001/leads", {
      headers: workspaceHeaders,
    }),
  );
  const leads = (await listResponse.json()) as Array<{ id: string }>;
  const leadId = leads[0]?.id;
  assert.ok(leadId);

  const patchResponse = await handleApiRequest(
    new Request(`http://localhost:3001/leads/${leadId}`, {
      method: "PATCH",
      headers: workspaceHeaders,
      body: JSON.stringify({
        status: "pending",
        assignee: "Luna",
        notes: "Schedule a product demo",
      }),
    }),
  );
  assert.equal(patchResponse.status, 200);
  const updated = (await patchResponse.json()) as {
    status: string;
    assignee: string | null;
    notes: string;
  };
  assert.equal(updated.status, "pending");
  assert.equal(updated.assignee, "Luna");
  assert.equal(updated.notes, "Schedule a product demo");

  const getLeadResponse = await handleApiRequest(
    new Request(`http://localhost:3001/leads/${leadId}`, {
      headers: workspaceHeaders,
    }),
  );
  assert.equal(getLeadResponse.status, 200);
  const leadDetail = (await getLeadResponse.json()) as { id: string; status: string };
  assert.equal(leadDetail.id, leadId);
  assert.equal(leadDetail.status, "pending");
});

test("public lead submission accepts multipart attachments and downloads them", { concurrency: false }, async () => {
  await resetTestState();
  const auth = await registerAndLogin();
  const { bot, site, headers: workspaceHeaders } = await createBotAndSite(
    auth.tokens.accessToken,
  );

  const chatResponse = await handleApiRequest(
    new Request("http://localhost:3001/public/chat/stream", {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({
        botId: bot.id,
        siteKey: site.siteKey,
        visitorId: "visitor-attachment",
        sdkVersion: "1.0.0",
        origin: "http://localhost:3000",
        message: "Please contact me about an industrial chiller quote.",
      }),
    }),
  );
  assert.equal(chatResponse.status, 200);
  const eventText = await chatResponse.text();
  const metaLine = eventText
    .split("\n")
    .find((line) => line.startsWith("data: {\"conversationId\""));
  const conversationId = metaLine
    ? (JSON.parse(metaLine.replace("data: ", "")) as { conversationId: string }).conversationId
    : "";
  assert.ok(conversationId);

  const formData = new FormData();
  formData.set("botId", bot.id);
  formData.set("siteKey", site.siteKey);
  formData.set("conversationId", conversationId);
  formData.set(
    "fields",
    JSON.stringify({
      name: "Attachment Lead",
      email: "attachment@example.com",
      company: "Factory Labs",
      requirement: "Need a detailed quote with layout constraints.",
    }),
  );
  formData.append(
    "quoteFile",
    new File([new TextEncoder().encode("mock pdf content")], "quote-request.pdf", {
      type: "application/pdf",
    }),
  );

  const leadCreateResponse = await handleApiRequest(
    new Request("http://localhost:3001/public/leads", {
      method: "POST",
      body: formData,
    }),
  );
  assert.equal(leadCreateResponse.status, 200);
  const createdLead = (await leadCreateResponse.json()) as {
    id: string;
    attachments: Array<{ id: string; fileName: string; fileType: string }>;
  };
  assert.equal(createdLead.attachments.length, 1);
  assert.equal(createdLead.attachments[0]?.fileName, "quote-request.pdf");

  const getLeadResponse = await handleApiRequest(
    new Request(`http://localhost:3001/leads/${createdLead.id}`, {
      headers: workspaceHeaders,
    }),
  );
  assert.equal(getLeadResponse.status, 200);
  const leadDetail = (await getLeadResponse.json()) as {
    attachments: Array<{ id: string; fileName: string; fileType: string; sizeBytes: number }>;
  };
  assert.equal(leadDetail.attachments.length, 1);
  assert.equal(leadDetail.attachments[0]?.fileType, "application/pdf");
  assert.ok((leadDetail.attachments[0]?.sizeBytes ?? 0) > 0);

  const attachmentId = leadDetail.attachments[0]?.id ?? "";
  assert.ok(attachmentId);
  const downloadResponse = await handleApiRequest(
    new Request(`http://localhost:3001/leads/${createdLead.id}/attachments/${attachmentId}`, {
      headers: workspaceHeaders,
    }),
  );
  assert.equal(downloadResponse.status, 200);
  assert.equal(downloadResponse.headers.get("content-type"), "application/pdf");
  const attachmentBytes = new Uint8Array(await downloadResponse.arrayBuffer());
  assert.equal(new TextDecoder().decode(attachmentBytes), "mock pdf content");
});

test("public lead submission deduplicates by conversation and merges fields", { concurrency: false }, async () => {
  await resetTestState();
  const auth = await registerAndLogin();
  const { bot, site, headers: workspaceHeaders } = await createBotAndSite(
    auth.tokens.accessToken,
  );

  const chatResponse = await handleApiRequest(
    new Request("http://localhost:3001/public/chat/stream", {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({
        botId: bot.id,
        siteKey: site.siteKey,
        visitorId: "visitor-dedupe",
        sdkVersion: "1.0.0",
        origin: "http://localhost:3000",
        message: "I need a custom deployment quote.",
      }),
    }),
  );
  assert.equal(chatResponse.status, 200);
  const eventText = await chatResponse.text();
  const metaLine = eventText
    .split("\n")
    .find((line) => line.startsWith("data: {\"conversationId\""));
  const conversationId = metaLine
    ? (JSON.parse(metaLine.replace("data: ", "")) as { conversationId: string }).conversationId
    : "";
  assert.ok(conversationId);

  const firstLeadResponse = await handleApiRequest(
    new Request("http://localhost:3001/public/leads", {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({
        botId: bot.id,
        siteKey: site.siteKey,
        conversationId,
        fields: {
          name: "Repeat Lead",
          email: "repeat@example.com",
          company: "Repeat Co",
          requirement: "Need a quote and delivery timeline.",
        },
      }),
    }),
  );
  assert.equal(firstLeadResponse.status, 200);
  const firstLead = (await firstLeadResponse.json()) as { id: string };

  const secondLeadResponse = await handleApiRequest(
    new Request("http://localhost:3001/public/leads", {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({
        botId: bot.id,
        siteKey: site.siteKey,
        conversationId,
        fields: {
          name: "Repeat Lead",
          email: "repeat@example.com",
          phone: "13800138000",
          company: "Repeat Co",
          requirement: "Need updated delivery timeline.",
        },
      }),
    }),
  );
  assert.equal(secondLeadResponse.status, 200);
  const secondLead = (await secondLeadResponse.json()) as {
    id: string;
    fields: Record<string, string>;
  };
  assert.equal(secondLead.id, firstLead.id);
  assert.equal(secondLead.fields.phone, "13800138000");

  const listResponse = await handleApiRequest(
    new Request("http://localhost:3001/leads", {
      headers: workspaceHeaders,
    }),
  );
  assert.equal(listResponse.status, 200);
  const leads = (await listResponse.json()) as Array<{
    id: string;
    phone?: string;
    requirement?: string;
  }>;
  assert.equal(leads.length, 1);
  assert.equal(leads[0]?.id, firstLead.id);
  assert.equal(leads[0]?.phone, "13800138000");
  assert.equal(leads[0]?.requirement, "Need updated delivery timeline.");
});

test("public lead submission keeps prior non-empty fields while allowing requirement refresh", { concurrency: false }, async () => {
  await resetTestState();
  const auth = await registerAndLogin();
  const { bot, site, headers: workspaceHeaders } = await createBotAndSite(
    auth.tokens.accessToken,
  );

  const chatResponse = await handleApiRequest(
    new Request("http://localhost:3001/public/chat/stream", {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({
        botId: bot.id,
        siteKey: site.siteKey,
        visitorId: "visitor-merge-policy",
        sdkVersion: "1.0.0",
        origin: "http://localhost:3000",
        message: "Need a packaged quote.",
      }),
    }),
  );
  assert.equal(chatResponse.status, 200);
  const eventText = await chatResponse.text();
  const metaLine = eventText
    .split("\n")
    .find((line) => line.startsWith("data: {\"conversationId\""));
  const conversationId = metaLine
    ? (JSON.parse(metaLine.replace("data: ", "")) as { conversationId: string }).conversationId
    : "";
  assert.ok(conversationId);

  const firstLeadResponse = await handleApiRequest(
    new Request("http://localhost:3001/public/leads", {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({
        botId: bot.id,
        siteKey: site.siteKey,
        conversationId,
        fields: {
          name: "Merge Policy Lead",
          email: "merge@example.com",
          phone: "13900139000",
          company: "Merge Factory",
          requirement: "Need first pricing package.",
        },
      }),
    }),
  );
  assert.equal(firstLeadResponse.status, 200);

  const secondLeadResponse = await handleApiRequest(
    new Request("http://localhost:3001/public/leads", {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({
        botId: bot.id,
        siteKey: site.siteKey,
        conversationId,
        fields: {
          name: "",
          email: "merge@example.com",
          phone: "",
          company: "",
          requirement: "Need updated pricing package with installation.",
        },
      }),
    }),
  );
  assert.equal(secondLeadResponse.status, 200);
  const secondLead = (await secondLeadResponse.json()) as {
    id: string;
    fields: Record<string, string>;
  };
  assert.equal(secondLead.fields.name, "Merge Policy Lead");
  assert.equal(secondLead.fields.phone, "13900139000");
  assert.equal(secondLead.fields.company, "Merge Factory");
  assert.equal(
    secondLead.fields.requirement,
    "Need updated pricing package with installation.",
  );

  const getLeadResponse = await handleApiRequest(
    new Request(`http://localhost:3001/leads/${secondLead.id}`, {
      headers: workspaceHeaders,
    }),
  );
  assert.equal(getLeadResponse.status, 200);
  const leadDetail = (await getLeadResponse.json()) as {
    phone?: string;
    company?: string;
    requirement?: string;
    followUpRecords?: Array<{ kind: string; title: string }>;
  };
  assert.equal(leadDetail.phone, "13900139000");
  assert.equal(leadDetail.company, "Merge Factory");
  assert.equal(leadDetail.requirement, "Need updated pricing package with installation.");
  assert.ok(leadDetail.followUpRecords?.some((item) => item.kind === "status"));
});

test("public lead submission deduplicates duplicate attachments in the same conversation", { concurrency: false }, async () => {
  await resetTestState();
  const auth = await registerAndLogin();
  const { bot, site, headers: workspaceHeaders } = await createBotAndSite(
    auth.tokens.accessToken,
  );

  const chatResponse = await handleApiRequest(
    new Request("http://localhost:3001/public/chat/stream", {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({
        botId: bot.id,
        siteKey: site.siteKey,
        visitorId: "visitor-attachment-dedupe",
        sdkVersion: "1.0.0",
        origin: "http://localhost:3000",
        message: "Need a quote with the same drawing twice.",
      }),
    }),
  );
  assert.equal(chatResponse.status, 200);
  const eventText = await chatResponse.text();
  const metaLine = eventText
    .split("\n")
    .find((line) => line.startsWith("data: {\"conversationId\""));
  const conversationId = metaLine
    ? (JSON.parse(metaLine.replace("data: ", "")) as { conversationId: string }).conversationId
    : "";
  assert.ok(conversationId);

  const makeFormData = () => {
    const formData = new FormData();
    formData.set("botId", bot.id);
    formData.set("siteKey", site.siteKey);
    formData.set("conversationId", conversationId);
    formData.set(
      "fields",
      JSON.stringify({
        name: "Attachment Dedupe Lead",
        email: "attach-dedupe@example.com",
        company: "Attachment Works",
        requirement: "Need quote with drawing attachment.",
      }),
    );
    formData.append(
      "drawingFile",
      new File([new TextEncoder().encode("same attachment payload")], "layout.pdf", {
        type: "application/pdf",
      }),
    );
    return formData;
  };

  const firstLeadResponse = await handleApiRequest(
    new Request("http://localhost:3001/public/leads", {
      method: "POST",
      body: makeFormData(),
    }),
  );
  assert.equal(firstLeadResponse.status, 200);
  const firstLead = (await firstLeadResponse.json()) as {
    id: string;
    attachments: Array<{ id: string }>;
  };
  assert.equal(firstLead.attachments.length, 1);

  const secondLeadResponse = await handleApiRequest(
    new Request("http://localhost:3001/public/leads", {
      method: "POST",
      body: makeFormData(),
    }),
  );
  assert.equal(secondLeadResponse.status, 200);
  const secondLead = (await secondLeadResponse.json()) as {
    id: string;
    attachments: Array<{ id: string; fileName: string }>;
  };
  assert.equal(secondLead.id, firstLead.id);
  assert.equal(secondLead.attachments.length, 1);
  assert.equal(secondLead.attachments[0]?.fileName, "layout.pdf");

  const getLeadResponse = await handleApiRequest(
    new Request(`http://localhost:3001/leads/${firstLead.id}`, {
      headers: workspaceHeaders,
    }),
  );
  assert.equal(getLeadResponse.status, 200);
  const leadDetail = (await getLeadResponse.json()) as {
    attachments: Array<{ id: string; downloadUrl?: string }>;
  };
  assert.equal(leadDetail.attachments.length, 1);
  assert.match(leadDetail.attachments[0]?.downloadUrl ?? "", /\/leads\/.*\/attachments\//);
});

test("bot detail, extended fields, and site domain patch work", { concurrency: false }, async () => {
  await resetTestState();
  const auth = await registerAndLogin();
  const { bot, site, headers: workspaceHeaders } = await createBotAndSite(
    auth.tokens.accessToken,
  );

  const getBotResponse = await handleApiRequest(
    new Request(`http://localhost:3001/bots/${bot.id}`, {
      headers: workspaceHeaders,
    }),
  );
  assert.equal(getBotResponse.status, 200);
  const botDetail = (await getBotResponse.json()) as { id: string; welcomeMessage: string };
  assert.equal(botDetail.id, bot.id);
  assert.ok(botDetail.welcomeMessage);

  const patchBotResponse = await handleApiRequest(
    new Request(`http://localhost:3001/bots/${bot.id}`, {
      method: "PATCH",
      headers: workspaceHeaders,
      body: JSON.stringify({
        welcomeMessage: "欢迎咨询",
        systemPrompt: "你是销售顾问。",
        rateLimitPerMinute: 60,
      }),
    }),
  );
  assert.equal(patchBotResponse.status, 200);
  const patchedBot = (await patchBotResponse.json()) as {
    welcomeMessage: string;
    systemPrompt: string;
    rateLimitPerMinute: number;
  };
  assert.equal(patchedBot.welcomeMessage, "欢迎咨询");
  assert.equal(patchedBot.systemPrompt, "你是销售顾问。");
  assert.equal(patchedBot.rateLimitPerMinute, 60);

  const getBotAgain = await handleApiRequest(
    new Request(`http://localhost:3001/bots/${bot.id}`, {
      headers: workspaceHeaders,
    }),
  );
  const persistedBot = (await getBotAgain.json()) as {
    welcomeMessage: string;
    systemPrompt: string;
  };
  assert.equal(persistedBot.welcomeMessage, "欢迎咨询");
  assert.equal(persistedBot.systemPrompt, "你是销售顾问。");

  const patchSiteResponse = await handleApiRequest(
    new Request(`http://localhost:3001/sites/${site.id}`, {
      method: "PATCH",
      headers: workspaceHeaders,
      body: JSON.stringify({
        allowedDomains: ["localhost", "app.example.com"],
      }),
    }),
  );
  assert.equal(patchSiteResponse.status, 200);
  const patchedSite = (await patchSiteResponse.json()) as {
    allowedDomains: string[];
    siteKeyPrefix: string;
    siteKey?: string;
  };
  assert.deepEqual(patchedSite.allowedDomains, ["localhost", "app.example.com"]);
  assert.equal(typeof patchedSite.siteKeyPrefix, "string");
  assert.equal("siteKey" in patchedSite, false);

  const listSitesResponse = await handleApiRequest(
    new Request("http://localhost:3001/sites", {
      headers: workspaceHeaders,
    }),
  );
  assert.equal(listSitesResponse.status, 200);
  const listedSites = (await listSitesResponse.json()) as Array<{
    id: string;
    siteKeyPrefix: string;
    siteKey?: string;
  }>;
  assert.equal(listedSites[0]?.id, site.id);
  assert.equal(typeof listedSites[0]?.siteKeyPrefix, "string");
  assert.equal("siteKey" in (listedSites[0] ?? {}), false);

  const rotateSiteResponse = await handleApiRequest(
    new Request(`http://localhost:3001/sites/${site.id}/rotate-key`, {
      method: "POST",
      headers: workspaceHeaders,
    }),
  );
  assert.equal(rotateSiteResponse.status, 200);
  const rotatedSite = (await rotateSiteResponse.json()) as {
    site: { id: string; siteKeyPrefix: string };
    revealedSiteKey: string;
  };
  assert.equal(rotatedSite.site.id, site.id);
  assert.equal(typeof rotatedSite.revealedSiteKey, "string");
  assert.notEqual(rotatedSite.revealedSiteKey, site.siteKey);

  const oldKeyResponse = await handleApiRequest(
    new Request("http://localhost:3001/public/chat/stream", {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({
        botId: bot.id,
        siteKey: site.siteKey,
        visitorId: "visitor-old-key",
        sdkVersion: "1.0.0",
        origin: "http://localhost:3000",
        message: "old key should fail",
      }),
    }),
  );
  assert.equal(oldKeyResponse.status, 401);
  const oldKeyBody = (await oldKeyResponse.json()) as { code: string };
  assert.equal(oldKeyBody.code, "UNAUTHORIZED");

  const newKeyResponse = await handleApiRequest(
    new Request("http://localhost:3001/public/chat/stream", {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({
        botId: bot.id,
        siteKey: rotatedSite.revealedSiteKey,
        visitorId: "visitor-new-key",
        sdkVersion: "1.0.0",
        origin: "http://localhost:3000",
        message: "new key should work",
      }),
    }),
  );
  assert.equal(newKeyResponse.status, 200);
});

test("bot recommended questions persist and appear in public config and SSE meta", { concurrency: false }, async () => {
  await resetTestState();
  const auth = await registerAndLogin();
  const { bot, site, headers: workspaceHeaders } = await createBotAndSite(
    auth.tokens.accessToken,
  );

  const questions = ["报价多少？", "支持图纸定制吗？", "交货周期多久？"];
  const patchResponse = await handleApiRequest(
    new Request(`http://localhost:3001/bots/${bot.id}`, {
      method: "PATCH",
      headers: workspaceHeaders,
      body: JSON.stringify({
        welcomeMessage: "欢迎咨询工业产品",
        recommendedQuestions: questions,
      }),
    }),
  );
  assert.equal(patchResponse.status, 200);
  const patched = (await patchResponse.json()) as {
    welcomeMessage: string;
    recommendedQuestions: string[];
  };
  assert.equal(patched.welcomeMessage, "欢迎咨询工业产品");
  assert.deepEqual(patched.recommendedQuestions, questions);

  const configResponse = await handleApiRequest(
    new Request(
      `http://localhost:3001/public/widget/config?botId=${encodeURIComponent(bot.id)}&siteKey=${encodeURIComponent(site.siteKey)}&origin=${encodeURIComponent("http://localhost:3000")}`,
    ),
  );
  assert.equal(configResponse.status, 200);
  const config = (await configResponse.json()) as {
    welcomeMessage: string;
    recommendedQuestions: string[];
  };
  assert.equal(config.welcomeMessage, "欢迎咨询工业产品");
  assert.deepEqual(config.recommendedQuestions, questions);

  const chatResponse = await handleApiRequest(
    new Request("http://localhost:3001/public/chat/stream", {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({
        botId: bot.id,
        siteKey: site.siteKey,
        visitorId: "visitor-rec-questions",
        sdkVersion: "1.0.0",
        origin: "http://localhost:3000",
        message: "你好",
      }),
    }),
  );
  assert.equal(chatResponse.status, 200);
  const text = await chatResponse.text();
  assert.match(text, /"welcomeMessage":"欢迎咨询工业产品"/);
  assert.match(text, /"recommendedQuestions":\["报价多少？","支持图纸定制吗？","交货周期多久？"\]/);
});

test("dashboard and report analytics endpoints return aggregated data", { concurrency: false }, async () => {
  await resetTestState();
  const auth = await registerAndLogin();
  const { bot, site, headers: workspaceHeaders } = await createBotAndSite(
    auth.tokens.accessToken,
  );

  const chatResponse = await handleApiRequest(
    new Request("http://localhost:3001/public/chat/stream", {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({
        botId: bot.id,
        siteKey: site.siteKey,
        visitorId: "visitor-analytics",
        sdkVersion: "1.0.0",
        origin: "http://localhost:3000",
        message: "I need pricing details for the professional plan.",
      }),
    }),
  );
  assert.equal(chatResponse.status, 200);
  const chatEventText = await chatResponse.text();
  const conversationId = chatEventText
    .split("\n")
    .find((line) => line.startsWith("data: {\"conversationId\""))
    ?.replace("data: ", "");
  assert.ok(conversationId);

  const parsedConversationId = JSON.parse(conversationId ?? "{}") as {
    conversationId?: string;
  };
  assert.ok(parsedConversationId.conversationId);

  const leadCreateResponse = await handleApiRequest(
    new Request("http://localhost:3001/public/leads", {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({
        botId: bot.id,
        siteKey: site.siteKey,
        conversationId: parsedConversationId.conversationId,
        fields: {
          name: "Analytics Lead",
          email: "analytics@example.com",
          company: "Analytics Equipment Co.",
          requirement: "需要专业版方案报价",
        },
      }),
    }),
  );
  assert.equal(leadCreateResponse.status, 200);

  const dashboardResponse = await handleApiRequest(
    new Request("http://localhost:3001/dashboard", {
      headers: workspaceHeaders,
    }),
  );
  assert.equal(dashboardResponse.status, 200);
  const dashboard = (await dashboardResponse.json()) as {
    hasBots: boolean;
    kpis: Array<{ id: string; value: string }>;
    trend7: Array<{ sessions: number; leads: number }>;
    frequentQuestions: Array<{ question: string }>;
    recentLeads: Array<{ name: string }>;
    channelDistribution: Array<{ label: string; sessions: number }>;
  };
  assert.equal(dashboard.hasBots, true);
  assert.equal(dashboard.kpis.length, 4);
  assert.ok(dashboard.trend7.length >= 1);
  assert.ok(dashboard.frequentQuestions.some((item) => item.question.includes("pricing")));
  assert.ok(dashboard.recentLeads.some((item) => item.name === "Analytics Lead"));
  assert.ok(dashboard.channelDistribution.some((item) => item.label.includes("localhost")));

  const reportsResponse = await handleApiRequest(
    new Request("http://localhost:3001/reports", {
      headers: workspaceHeaders,
    }),
  );
  assert.equal(reportsResponse.status, 200);
  const reports = (await reportsResponse.json()) as {
    hasBots: boolean;
    period: { sessions7d: number; leads7d: number };
    botMetrics: Array<{ id: string; sessions7d: number }>;
    frequentQuestions: Array<{ question: string }>;
  };
  assert.equal(reports.hasBots, true);
  assert.ok(reports.period.sessions7d >= 1);
  assert.ok(reports.period.leads7d >= 1);
  assert.ok(reports.botMetrics.some((item) => item.id === bot.id));
  assert.ok(reports.frequentQuestions.some((item) => item.question.includes("pricing")));
});

test("auth refresh and workspace endpoints work", { concurrency: false }, async () => {
  await resetTestState();
  const auth = await registerAndLogin();
  const workspaceHeaders = {
    ...jsonHeaders,
    authorization: `Bearer ${auth.tokens.accessToken}`,
  };

  const currentResponse = await handleApiRequest(
    new Request("http://localhost:3001/workspaces/current", {
      headers: workspaceHeaders,
    }),
  );
  assert.equal(currentResponse.status, 200);
  const current = (await currentResponse.json()) as { id: string; isActive: boolean };
  assert.equal(current.isActive, true);

  const listResponse = await handleApiRequest(
    new Request("http://localhost:3001/workspaces", {
      headers: workspaceHeaders,
    }),
  );
  assert.equal(listResponse.status, 200);
  const workspaces = (await listResponse.json()) as Array<{ id: string }>;
  assert.ok(workspaces.some((item) => item.id === current.id));

  const refreshResponse = await handleApiRequest(
    new Request("http://localhost:3001/auth/refresh", {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({ refreshToken: auth.tokens.refreshToken }),
    }),
  );
  assert.equal(refreshResponse.status, 200);
  const refreshed = (await refreshResponse.json()) as {
    tokens: { accessToken: string; refreshToken: string };
  };
  assert.ok(refreshed.tokens.accessToken);
  assert.ok(refreshed.tokens.refreshToken);
});

test("email code login creates first-time account and rejects reused code", { concurrency: false }, async () => {
  await resetTestState();
  const email = "code-login@example.com";

  const requestResponse = await requestEmailLoginCode(email);
  assert.equal(requestResponse.status, 200);
  const requested = (await requestResponse.json()) as {
    sent: true;
    expiresAt: string;
    debugCode?: string;
  };
  assert.equal(requested.sent, true);
  assert.ok(requested.expiresAt);
  assert.match(requested.debugCode ?? "", /^\d{6}$/);
  const runtime = await getRuntime();
  const codeMailer = runtime.emailLoginCodeDebugMailer;
  assert.ok(codeMailer);
  assert.equal(codeMailer.listSent().length, 1);
  assert.equal(codeMailer.listSent()[0]?.recipientEmail, email);

  const verifyResponse = await handleApiRequest(
    new Request("http://localhost:3001/auth/code/verify", {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({
        email,
        code: requested.debugCode,
      }),
    }),
  );
  assert.equal(verifyResponse.status, 200);
  const verified = (await verifyResponse.json()) as {
    user: { email: string; activeWorkspaceId: string | null };
    workspaces: Array<{ isActive: boolean }>;
    tokens: { accessToken: string };
  };
  assert.equal(verified.user.email, email);
  assert.ok(verified.user.activeWorkspaceId);
  assert.ok(verified.workspaces.some((workspace) => workspace.isActive));
  assert.ok(verified.tokens.accessToken);

  const reusedResponse = await handleApiRequest(
    new Request("http://localhost:3001/auth/code/verify", {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({
        email,
        code: requested.debugCode,
      }),
    }),
  );
  assert.equal(reusedResponse.status, 401);
  const reusedBody = (await reusedResponse.json()) as { message: string };
  assert.equal(reusedBody.message, "Verification code has already been used.");
});

test("email code login rejects incorrect code", { concurrency: false }, async () => {
  await resetTestState();
  const email = "wrong-code@example.com";

  const requestResponse = await requestEmailLoginCode(email);
  assert.equal(requestResponse.status, 200);
  const requested = (await requestResponse.json()) as { debugCode?: string };
  const wrongCode = requested.debugCode === "000000" ? "111111" : "000000";

  const verifyResponse = await handleApiRequest(
    new Request("http://localhost:3001/auth/code/verify", {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({
        email,
        code: wrongCode,
      }),
    }),
  );
  assert.equal(verifyResponse.status, 401);
  const body = (await verifyResponse.json()) as { message: string };
  assert.equal(body.message, "Verification code is incorrect.");
});

test("password reset code updates password and allows sign-in with the new secret", { concurrency: false }, async () => {
  await resetTestState();
  const email = "resettable@example.com";
  await registerUser(email, "Resettable User");

  const requestResponse = await requestPasswordResetCode(email);
  assert.equal(requestResponse.status, 200);
  const requested = (await requestResponse.json()) as { debugCode?: string };
  assert.match(requested.debugCode ?? "", /^\d{6}$/);

  const resetResponse = await handleApiRequest(
    new Request("http://localhost:3001/auth/password-reset/confirm", {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({
        email,
        code: requested.debugCode,
        newPassword: "new-secret-123",
      }),
    }),
  );
  assert.equal(resetResponse.status, 200);

  const oldLoginResponse = await handleApiRequest(
    new Request("http://localhost:3001/auth/login", {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({
        email,
        password: "secret123",
      }),
    }),
  );
  assert.equal(oldLoginResponse.status, 401);

  const newLoginResponse = await handleApiRequest(
    new Request("http://localhost:3001/auth/login", {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({
        email,
        password: "new-secret-123",
      }),
    }),
  );
  assert.equal(newLoginResponse.status, 200);
});

test("password reset request does not reveal whether an account exists", { concurrency: false }, async () => {
  await resetTestState();
  const unknownEmail = "no-such-account-987@example.com";

  const requestResponse = await requestPasswordResetCode(unknownEmail);
  assert.equal(requestResponse.status, 200);

  const body = (await requestResponse.json()) as { message?: string };
  assert.notEqual(requestResponse.status, 404);
  assert.ok(!body.message || !/no account/i.test(body.message ?? ""));
});

test("password reset confirm for unknown account returns same generic error as wrong code", { concurrency: false }, async () => {
  await resetTestState();
  const unknownEmail = "no-such-account-654@example.com";

  const confirmResponse = await handleApiRequest(
    new Request("http://localhost:3001/auth/password-reset/confirm", {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({
        email: unknownEmail,
        code: "000000",
        newPassword: "whatever-123",
      }),
    }),
  );
  assert.equal(confirmResponse.status, 401);
  const body = (await confirmResponse.json()) as { message: string };
  // 不得出现账号存在性提示；返回与「验证码错误/失效」一致的泛型错误即可。
  assert.ok(!/no account/i.test(body.message ?? ""));
  assert.ok(/verification code/i.test(body.message ?? ""));
});

test("workspace invitations and member role management work", { concurrency: false }, async () => {
  await resetTestState();
  const owner = await registerAndLogin();
  const invitedEmail = "member@example.com";

  const inviteResponse = await createWorkspaceInvite(owner.tokens.accessToken, {
    email: invitedEmail,
    role: "member",
  });
  assert.equal(inviteResponse.status, 200);
  const invitation = (await inviteResponse.json()) as {
    id: string;
    workspaceId: string;
    email: string;
    status: string;
  };
  assert.equal(invitation.email, invitedEmail);
  assert.equal(invitation.status, "pending");

  const memberAuth = await registerUser(invitedEmail, "Member User");

  const acceptResponse = await handleApiRequest(
    new Request(`http://localhost:3001/workspace-invitations/${invitation.id}/accept`, {
      method: "POST",
      headers: {
        ...jsonHeaders,
        authorization: `Bearer ${memberAuth.tokens.accessToken}`,
      },
    }),
  );
  assert.equal(acceptResponse.status, 200);
  const accepted = (await acceptResponse.json()) as { status: string; acceptedAt: string | null };
  assert.equal(accepted.status, "accepted");
  assert.ok(accepted.acceptedAt);

  const listMembersResponse = await handleApiRequest(
    new Request("http://localhost:3001/workspace-members", {
      headers: {
        ...jsonHeaders,
        authorization: `Bearer ${owner.tokens.accessToken}`,
      },
    }),
  );
  assert.equal(listMembersResponse.status, 200);
  const members = (await listMembersResponse.json()) as Array<{
    userId: string;
    email: string;
    role: string;
  }>;
  const invitedMember = members.find((item) => item.email === invitedEmail);
  assert.ok(invitedMember);
  assert.equal(invitedMember.role, "member");

  const promoteResponse = await handleApiRequest(
    new Request(`http://localhost:3001/workspace-members/${invitedMember.userId}`, {
      method: "PATCH",
      headers: {
        ...jsonHeaders,
        authorization: `Bearer ${owner.tokens.accessToken}`,
      },
      body: JSON.stringify({ role: "admin" }),
    }),
  );
  assert.equal(promoteResponse.status, 200);
  const promoted = (await promoteResponse.json()) as { role: string };
  assert.equal(promoted.role, "admin");

  const removeResponse = await handleApiRequest(
    new Request(`http://localhost:3001/workspace-members/${invitedMember.userId}`, {
      method: "DELETE",
      headers: {
        ...jsonHeaders,
        authorization: `Bearer ${owner.tokens.accessToken}`,
      },
    }),
  );
  assert.equal(removeResponse.status, 200);
  const removed = (await removeResponse.json()) as { removedUserId: string };
  assert.equal(removed.removedUserId, invitedMember.userId);
});

test("member cannot invite others into workspace", { concurrency: false }, async () => {
  await resetTestState();
  const owner = await registerAndLogin();
  const invitedEmail = "member-limit@example.com";

  const inviteResponse = await createWorkspaceInvite(owner.tokens.accessToken, {
    email: invitedEmail,
    role: "member",
  });
  assert.equal(inviteResponse.status, 200);
  const invitation = (await inviteResponse.json()) as { id: string; workspaceId: string };

  const memberAuth = await registerUser(invitedEmail, "Member Limit");

  const acceptResponse = await handleApiRequest(
    new Request(`http://localhost:3001/workspace-invitations/${invitation.id}/accept`, {
      method: "POST",
      headers: {
        ...jsonHeaders,
        authorization: `Bearer ${memberAuth.tokens.accessToken}`,
      },
    }),
  );
  assert.equal(acceptResponse.status, 200);

  const activateResponse = await handleApiRequest(
    new Request(`http://localhost:3001/workspaces/${invitation.workspaceId}/activate`, {
      method: "POST",
      headers: {
        ...jsonHeaders,
        authorization: `Bearer ${memberAuth.tokens.accessToken}`,
      },
    }),
  );
  assert.equal(activateResponse.status, 200);

  const forbiddenInviteResponse = await createWorkspaceInvite(memberAuth.tokens.accessToken, {
    email: "another@example.com",
    role: "member",
  });
  assert.equal(forbiddenInviteResponse.status, 401);
  const forbiddenBody = (await forbiddenInviteResponse.json()) as { code: string };
  assert.equal(forbiddenBody.code, "UNAUTHORIZED");
});

test("viewer can join workspace but cannot change conversations or leads", { concurrency: false }, async () => {
  await resetTestState();
  const owner = await registerAndLogin();
  const viewerEmail = "viewer@example.com";
  const { bot, site, headers: ownerHeaders } = await createBotAndSite(owner.tokens.accessToken);

  const inviteResponse = await createWorkspaceInvite(owner.tokens.accessToken, {
    email: viewerEmail,
    role: "viewer",
  });
  assert.equal(inviteResponse.status, 200);
  const invitation = (await inviteResponse.json()) as { id: string; workspaceId: string };

  const viewerAuth = await registerUser(viewerEmail, "Viewer User");
  const acceptResponse = await handleApiRequest(
    new Request(`http://localhost:3001/workspace-invitations/${invitation.id}/accept`, {
      method: "POST",
      headers: {
        ...jsonHeaders,
        authorization: `Bearer ${viewerAuth.tokens.accessToken}`,
      },
    }),
  );
  assert.equal(acceptResponse.status, 200);

  const activateResponse = await handleApiRequest(
    new Request(`http://localhost:3001/workspaces/${invitation.workspaceId}/activate`, {
      method: "POST",
      headers: {
        ...jsonHeaders,
        authorization: `Bearer ${viewerAuth.tokens.accessToken}`,
      },
    }),
  );
  assert.equal(activateResponse.status, 200);

  const chatResponse = await handleApiRequest(
    new Request("http://localhost:3001/public/chat/stream", {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({
        botId: bot.id,
        siteKey: site.siteKey,
        visitorId: "viewer-visitor",
        sdkVersion: "1.0.0",
        origin: "http://localhost:3000",
        message: "Need pricing details.",
      }),
    }),
  );
  assert.equal(chatResponse.status, 200);
  const eventText = await chatResponse.text();
  const metaLine = eventText
    .split("\n")
    .find((line) => line.startsWith("data: {\"conversationId\""));
  const conversationId = metaLine
    ? (JSON.parse(metaLine.replace("data: ", "")) as { conversationId: string }).conversationId
    : "";
  assert.ok(conversationId);

  const leadCreateResponse = await handleApiRequest(
    new Request("http://localhost:3001/public/leads", {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({
        botId: bot.id,
        siteKey: site.siteKey,
        conversationId,
        fields: {
          name: "Viewer Prospect",
          email: "prospect@example.com",
          company: "Viewer Co",
          requirement: "Need quote and delivery timeline",
        },
      }),
    }),
  );
  assert.equal(leadCreateResponse.status, 200);

  const listLeadResponse = await handleApiRequest(
    new Request("http://localhost:3001/leads", {
      headers: ownerHeaders,
    }),
  );
  const leads = (await listLeadResponse.json()) as Array<{ id: string }>;
  const leadId = leads[0]?.id ?? "";
  assert.ok(leadId);

  const viewerHeaders = {
    ...jsonHeaders,
    authorization: `Bearer ${viewerAuth.tokens.accessToken}`,
    "x-workspace-id": invitation.workspaceId,
  };

  const patchConversationResponse = await handleApiRequest(
    new Request(`http://localhost:3001/conversations/${conversationId}`, {
      method: "PATCH",
      headers: viewerHeaders,
      body: JSON.stringify({ status: "resolved" }),
    }),
  );
  assert.equal(patchConversationResponse.status, 401);

  const patchLeadResponse = await handleApiRequest(
    new Request(`http://localhost:3001/leads/${leadId}`, {
      method: "PATCH",
      headers: viewerHeaders,
      body: JSON.stringify({ status: "pending" }),
    }),
  );
  assert.equal(patchLeadResponse.status, 401);
});

test("sales_member alias is accepted and can update conversations and leads", { concurrency: false }, async () => {
  await resetTestState();
  const owner = await registerAndLogin();
  const salesEmail = "sales@example.com";
  const { bot, site, headers: ownerHeaders } = await createBotAndSite(owner.tokens.accessToken);

  const inviteResponse = await createWorkspaceInvite(owner.tokens.accessToken, {
    email: salesEmail,
    role: "sales_member",
  });
  assert.equal(inviteResponse.status, 200);
  const invitation = (await inviteResponse.json()) as {
    id: string;
    workspaceId: string;
    role: string;
  };
  assert.equal(invitation.role, "member");

  const salesAuth = await registerUser(salesEmail, "Sales User");
  const acceptResponse = await handleApiRequest(
    new Request(`http://localhost:3001/workspace-invitations/${invitation.id}/accept`, {
      method: "POST",
      headers: {
        ...jsonHeaders,
        authorization: `Bearer ${salesAuth.tokens.accessToken}`,
      },
    }),
  );
  assert.equal(acceptResponse.status, 200);

  const activateResponse = await handleApiRequest(
    new Request(`http://localhost:3001/workspaces/${invitation.workspaceId}/activate`, {
      method: "POST",
      headers: {
        ...jsonHeaders,
        authorization: `Bearer ${salesAuth.tokens.accessToken}`,
      },
    }),
  );
  assert.equal(activateResponse.status, 200);

  const chatResponse = await handleApiRequest(
    new Request("http://localhost:3001/public/chat/stream", {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({
        botId: bot.id,
        siteKey: site.siteKey,
        visitorId: "sales-visitor",
        sdkVersion: "1.0.0",
        origin: "http://localhost:3000",
        message: "Please help with product selection.",
      }),
    }),
  );
  assert.equal(chatResponse.status, 200);
  const eventText = await chatResponse.text();
  const metaLine = eventText
    .split("\n")
    .find((line) => line.startsWith("data: {\"conversationId\""));
  const conversationId = metaLine
    ? (JSON.parse(metaLine.replace("data: ", "")) as { conversationId: string }).conversationId
    : "";
  assert.ok(conversationId);

  const leadCreateResponse = await handleApiRequest(
    new Request("http://localhost:3001/public/leads", {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({
        botId: bot.id,
        siteKey: site.siteKey,
        conversationId,
        fields: {
          name: "Sales Prospect",
          email: "sales-prospect@example.com",
          company: "Sales Co",
          requirement: "Need sales follow-up and pricing proposal",
        },
      }),
    }),
  );
  assert.equal(leadCreateResponse.status, 200);

  const listLeadResponse = await handleApiRequest(
    new Request("http://localhost:3001/leads", {
      headers: ownerHeaders,
    }),
  );
  const leads = (await listLeadResponse.json()) as Array<{ id: string }>;
  const leadId = leads[0]?.id ?? "";
  assert.ok(leadId);

  const salesHeaders = {
    ...jsonHeaders,
    authorization: `Bearer ${salesAuth.tokens.accessToken}`,
    "x-workspace-id": invitation.workspaceId,
  };

  const patchConversationResponse = await handleApiRequest(
    new Request(`http://localhost:3001/conversations/${conversationId}`, {
      method: "PATCH",
      headers: salesHeaders,
      body: JSON.stringify({ status: "resolved", tags: ["handoff"] }),
    }),
  );
  assert.equal(patchConversationResponse.status, 200);

  const patchLeadResponse = await handleApiRequest(
    new Request(`http://localhost:3001/leads/${leadId}`, {
      method: "PATCH",
      headers: salesHeaders,
      body: JSON.stringify({ status: "pending", notes: "Sales follow-up created" }),
    }),
  );
  assert.equal(patchLeadResponse.status, 200);
  const patchedLead = (await patchLeadResponse.json()) as {
    followUpRecords?: Array<{ kind: string; title: string }>;
  };
  assert.ok((patchedLead.followUpRecords?.length ?? 0) >= 2);
  assert.ok(patchedLead.followUpRecords?.some((item) => item.kind === "status"));
  assert.ok(patchedLead.followUpRecords?.some((item) => item.kind === "note"));
});

test("workspace invitation can be revoked and resent", { concurrency: false }, async () => {
  await resetTestState();
  const owner = await registerAndLogin();
  const invitedEmail = "invite-retry@example.com";

  const inviteResponse = await createWorkspaceInvite(owner.tokens.accessToken, {
    email: invitedEmail,
    role: "member",
  });
  assert.equal(inviteResponse.status, 200);
  const invitation = (await inviteResponse.json()) as {
    id: string;
    status: string;
    token: string;
    inviteUrl: string;
    expiresAt: string;
  };
  assert.match(invitation.inviteUrl, /accept-invite\?token=/);

  const runtime = await getRuntime();
  const mailer = runtime.invitationDebugMailer;
  assert.ok(mailer);
  assert.equal(mailer.listSent().length, 1);

  const lookupResponse = await handleApiRequest(
    new Request(`http://localhost:3001/workspace-invitations/token/${invitation.token}`, {
      headers: jsonHeaders,
    }),
  );
  assert.equal(lookupResponse.status, 200);
  const lookup = (await lookupResponse.json()) as {
    email: string;
    status: string;
    inviteUrl: string;
  };
  assert.equal(lookup.email, invitedEmail);
  assert.equal(lookup.status, "pending");
  assert.equal(lookup.inviteUrl, invitation.inviteUrl);

  const revokeResponse = await handleApiRequest(
    new Request(`http://localhost:3001/workspace-invitations/${invitation.id}/revoke`, {
      method: "POST",
      headers: {
        ...jsonHeaders,
        authorization: `Bearer ${owner.tokens.accessToken}`,
      },
    }),
  );
  assert.equal(revokeResponse.status, 200);
  const revoked = (await revokeResponse.json()) as { status: string };
  assert.equal(revoked.status, "revoked");

  const invitedUser = await registerUser(invitedEmail, "Invite Retry");
  const acceptRevokedResponse = await handleApiRequest(
    new Request(`http://localhost:3001/workspace-invitations/${invitation.id}/accept`, {
      method: "POST",
      headers: {
        ...jsonHeaders,
        authorization: `Bearer ${invitedUser.tokens.accessToken}`,
      },
    }),
  );
  assert.equal(acceptRevokedResponse.status, 400);

  const resendResponse = await handleApiRequest(
    new Request(`http://localhost:3001/workspace-invitations/${invitation.id}/resend`, {
      method: "POST",
      headers: {
        ...jsonHeaders,
        authorization: `Bearer ${owner.tokens.accessToken}`,
      },
    }),
  );
  assert.equal(resendResponse.status, 200);
  const resent = (await resendResponse.json()) as {
    status: string;
    acceptedAt: string | null;
    token: string;
    inviteUrl: string;
    expiresAt: string;
  };
  assert.equal(resent.status, "pending");
  assert.equal(resent.acceptedAt, null);
  assert.notEqual(resent.token, invitation.token);
  assert.notEqual(resent.inviteUrl, invitation.inviteUrl);
  assert.notEqual(resent.expiresAt, invitation.expiresAt);
  assert.equal(mailer.listSent().length, 2);

  const auditsResponse = await handleApiRequest(
    new Request(`http://localhost:3001/workspace-invitations/${invitation.id}/delivery-audits`, {
      headers: {
        ...jsonHeaders,
        authorization: `Bearer ${owner.tokens.accessToken}`,
      },
    }),
  );
  assert.equal(auditsResponse.status, 200);
  const audits = (await auditsResponse.json()) as Array<{ status: string; attempt: number }>;
  assert.equal(audits.length, 2);
  assert.deepEqual(
    audits.map((entry) => entry.status),
    ["sent", "sent"],
  );

  const acceptResentResponse = await handleApiRequest(
    new Request(`http://localhost:3001/workspace-invitations/${invitation.id}/accept`, {
      method: "POST",
      headers: {
        ...jsonHeaders,
        authorization: `Bearer ${invitedUser.tokens.accessToken}`,
      },
    }),
  );
  assert.equal(acceptResentResponse.status, 200);
  const accepted = (await acceptResentResponse.json()) as { status: string };
  assert.equal(accepted.status, "accepted");
});

test("owner can transfer ownership and old owner loses owner-only action", { concurrency: false }, async () => {
  await resetTestState();
  const owner = await registerAndLogin();
  const targetEmail = "future-owner@example.com";

  const inviteResponse = await createWorkspaceInvite(owner.tokens.accessToken, {
    email: targetEmail,
    role: "admin",
  });
  assert.equal(inviteResponse.status, 200);
  const invitation = (await inviteResponse.json()) as { id: string; workspaceId: string };

  const targetUser = await registerUser(targetEmail, "Future Owner");
  const acceptResponse = await handleApiRequest(
    new Request(`http://localhost:3001/workspace-invitations/${invitation.id}/accept`, {
      method: "POST",
      headers: {
        ...jsonHeaders,
        authorization: `Bearer ${targetUser.tokens.accessToken}`,
      },
    }),
  );
  assert.equal(acceptResponse.status, 200);

  const activateResponse = await handleApiRequest(
    new Request(`http://localhost:3001/workspaces/${invitation.workspaceId}/activate`, {
      method: "POST",
      headers: {
        ...jsonHeaders,
        authorization: `Bearer ${targetUser.tokens.accessToken}`,
      },
    }),
  );
  assert.equal(activateResponse.status, 200);

  const membersBeforeResponse = await handleApiRequest(
    new Request("http://localhost:3001/workspace-members", {
      headers: {
        ...jsonHeaders,
        authorization: `Bearer ${owner.tokens.accessToken}`,
      },
    }),
  );
  assert.equal(membersBeforeResponse.status, 200);
  const membersBefore = (await membersBeforeResponse.json()) as Array<{
    userId: string;
    email: string;
    role: string;
  }>;
  const targetMember = membersBefore.find((item) => item.email === targetEmail);
  assert.ok(targetMember);

  const transferResponse = await handleApiRequest(
    new Request(`http://localhost:3001/workspaces/${invitation.workspaceId}/transfer-owner`, {
      method: "POST",
      headers: {
        ...jsonHeaders,
        authorization: `Bearer ${owner.tokens.accessToken}`,
      },
      body: JSON.stringify({ targetUserId: targetMember.userId }),
    }),
  );
  assert.equal(transferResponse.status, 200);
  const transfer = (await transferResponse.json()) as {
    previousOwner: { role: string };
    newOwner: { role: string };
  };
  assert.equal(transfer.previousOwner.role, "admin");
  assert.equal(transfer.newOwner.role, "owner");

  const oldOwnerTransferAgain = await handleApiRequest(
    new Request(`http://localhost:3001/workspaces/${invitation.workspaceId}/transfer-owner`, {
      method: "POST",
      headers: {
        ...jsonHeaders,
        authorization: `Bearer ${owner.tokens.accessToken}`,
      },
      body: JSON.stringify({ targetUserId: targetMember.userId }),
    }),
  );
  assert.equal(oldOwnerTransferAgain.status, 401);
});

test("invitation can be accepted directly by token", { concurrency: false }, async () => {
  await resetTestState();
  const owner = await registerAndLogin();
  const invitedEmail = "token-accept@example.com";

  const inviteResponse = await createWorkspaceInvite(owner.tokens.accessToken, {
    email: invitedEmail,
    role: "member",
  });
  assert.equal(inviteResponse.status, 200);
  const invitation = (await inviteResponse.json()) as {
    token: string;
    workspaceId: string;
  };

  const invitedUser = await registerUser(invitedEmail, "Token Accept");
  const acceptResponse = await handleApiRequest(
    new Request(
      `http://localhost:3001/workspace-invitations/token/${invitation.token}/accept`,
      {
        method: "POST",
        headers: {
          ...jsonHeaders,
          authorization: `Bearer ${invitedUser.tokens.accessToken}`,
        },
      },
    ),
  );
  assert.equal(acceptResponse.status, 200);
  const accepted = (await acceptResponse.json()) as { status: string; workspaceId: string };
  assert.equal(accepted.status, "accepted");
  assert.equal(accepted.workspaceId, invitation.workspaceId);
});

test("protected routes reject missing bearer token", { concurrency: false }, async () => {
  await resetTestState();
  const response = await handleApiRequest(
    new Request("http://localhost:3001/knowledge-bases", {
      headers: jsonHeaders,
    }),
  );
  assert.equal(response.status, 401);
  const body = (await response.json()) as { code: string };
  assert.equal(body.code, "UNAUTHORIZED");
});

test("multipart document upload is parsed and searchable", { concurrency: false }, async () => {
  await resetTestState();
  const auth = await registerAndLogin();
  const workspaceHeaders = {
    authorization: `Bearer ${auth.tokens.accessToken}`,
  };

  const kbResponse = await handleApiRequest(
    new Request("http://localhost:3001/knowledge-bases", {
      method: "POST",
      headers: {
        ...jsonHeaders,
        ...workspaceHeaders,
      },
      body: JSON.stringify({ name: "Upload KB" }),
    }),
  );
  assert.equal(kbResponse.status, 200);
  const knowledgeBase = (await kbResponse.json()) as { id: string };

  const formData = new FormData();
  formData.append(
    "files",
    new File(
      [
        "Private deployment includes domain binding and SSO support.\n\nProfessional plan includes advanced reporting.",
      ],
      "deployment-notes.md",
      { type: "text/markdown" },
    ),
  );

  const uploadResponse = await handleApiRequest(
    new Request(`http://localhost:3001/knowledge-bases/${knowledgeBase.id}/documents`, {
      method: "POST",
      headers: workspaceHeaders,
      body: formData,
    }),
  );
  assert.equal(uploadResponse.status, 200);
  const uploaded = (await uploadResponse.json()) as Array<{ id: string; status: string }>;
  assert.equal(uploaded.length, 1);
  const documentId = uploaded[0]?.id ?? "";
  assert.ok(documentId);

  const readyDocument = await waitFor(
    async () => {
      const response = await handleApiRequest(
        new Request(`http://localhost:3001/documents/${documentId}`, {
          headers: {
            ...jsonHeaders,
            ...workspaceHeaders,
          },
        }),
      );
      return (await response.json()) as { status: string; chunkCount: number | null };
    },
    (document) => document.status === "ready" && (document.chunkCount ?? 0) > 0,
  );
  assert.equal(readyDocument.status, "ready");

  const botResponse = await handleApiRequest(
    new Request("http://localhost:3001/bots", {
      method: "POST",
      headers: {
        ...jsonHeaders,
        ...workspaceHeaders,
      },
      body: JSON.stringify({
        name: "KB Search Bot",
        status: "active",
        knowledgeBaseIds: [knowledgeBase.id],
      }),
    }),
  );
  assert.equal(botResponse.status, 200);
  const bot = (await botResponse.json()) as { id: string };

  const siteResponse = await handleApiRequest(
    new Request("http://localhost:3001/sites", {
      method: "POST",
      headers: {
        ...jsonHeaders,
        ...workspaceHeaders,
      },
      body: JSON.stringify({
        botId: bot.id,
        name: "Upload Site",
        allowedDomains: ["localhost"],
      }),
    }),
  );
  assert.equal(siteResponse.status, 200);
  const sitePayload = (await siteResponse.json()) as {
    site: { siteKeyPrefix: string };
    revealedSiteKey: string;
  };
  const site = { siteKey: sitePayload.revealedSiteKey };

  const chatResponse = await handleApiRequest(
    new Request("http://localhost:3001/public/chat/stream", {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({
        botId: bot.id,
        siteKey: site.siteKey,
        visitorId: "visitor-upload",
        sdkVersion: "1.0.0",
        origin: "http://localhost:3000",
        message: "Does private deployment support SSO?",
      }),
    }),
  );
  assert.equal(chatResponse.status, 200);
  const sse = await chatResponse.text();
  assert.match(sse, /deployment-notes\.md/);
  assert.match(sse, /SSO support/);
});

test("document upload rejects unsupported file types", { concurrency: false }, async () => {
  await resetTestState();
  const auth = await registerAndLogin();
  const workspaceHeaders = {
    authorization: `Bearer ${auth.tokens.accessToken}`,
  };

  const kbResponse = await handleApiRequest(
    new Request("http://localhost:3001/knowledge-bases", {
      method: "POST",
      headers: {
        ...jsonHeaders,
        ...workspaceHeaders,
      },
      body: JSON.stringify({ name: "Restricted KB" }),
    }),
  );
  assert.equal(kbResponse.status, 200);
  const knowledgeBase = (await kbResponse.json()) as { id: string };

  const formData = new FormData();
  formData.append(
    "files",
    new File(["spreadsheet"], "pricing.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
  );

  const uploadResponse = await handleApiRequest(
    new Request(`http://localhost:3001/knowledge-bases/${knowledgeBase.id}/documents`, {
      method: "POST",
      headers: workspaceHeaders,
      body: formData,
    }),
  );
  assert.equal(uploadResponse.status, 400);
  const body = (await uploadResponse.json()) as { code: string; message: string };
  assert.equal(body.code, "VALIDATION_ERROR");
  assert.match(body.message, /Only PDF, DOCX, TXT, and MD files are supported/i);
});

test("document parser marks unreadable pdf as failed without breaking upload", { concurrency: false }, async () => {
  await resetTestState();
  const auth = await registerAndLogin();
  const workspaceHeaders = {
    authorization: `Bearer ${auth.tokens.accessToken}`,
  };

  const kbResponse = await handleApiRequest(
    new Request("http://localhost:3001/knowledge-bases", {
      method: "POST",
      headers: {
        ...jsonHeaders,
        ...workspaceHeaders,
      },
      body: JSON.stringify({ name: "Unreadable PDF KB" }),
    }),
  );
  assert.equal(kbResponse.status, 200);
  const knowledgeBase = (await kbResponse.json()) as { id: string };

  const formData = new FormData();
  formData.append(
    "files",
    new File(["%PDF-1.4\n%%EOF"], "scan-only.pdf", {
      type: "application/pdf",
    }),
  );

  const uploadResponse = await handleApiRequest(
    new Request(`http://localhost:3001/knowledge-bases/${knowledgeBase.id}/documents`, {
      method: "POST",
      headers: workspaceHeaders,
      body: formData,
    }),
  );
  assert.equal(uploadResponse.status, 200);
  const uploaded = (await uploadResponse.json()) as Array<{ id: string; status: string }>;
  const documentId = uploaded[0]?.id ?? "";
  assert.ok(documentId);

  const failedDocument = await waitFor(
    async () => {
      const response = await handleApiRequest(
        new Request(`http://localhost:3001/documents/${documentId}`, {
          headers: {
            ...jsonHeaders,
            ...workspaceHeaders,
          },
        }),
      );
      return (await response.json()) as {
        status: string;
        chunkCount: number | null;
        errorCode: string | null;
        errorMessage: string | null;
      };
    },
    (document) => document.status === "failed",
  );
  assert.equal(failedDocument.status, "failed");
  assert.equal(failedDocument.chunkCount, null);
  assert.equal(failedDocument.errorCode, "no_extractable_text");
  assert.match(failedDocument.errorMessage ?? "", /No extractable text found/i);

  const listResponse = await handleApiRequest(
    new Request(`http://localhost:3001/knowledge-bases/${knowledgeBase.id}`, {
      headers: {
        ...jsonHeaders,
        ...workspaceHeaders,
      },
    }),
  );
  assert.equal(listResponse.status, 200);
  const summary = (await listResponse.json()) as { failedDocumentCount: number };
  assert.equal(summary.failedDocumentCount, 1);
});

test("document delete removes it from knowledge base and search results", { concurrency: false }, async () => {
  await resetTestState();
  const auth = await registerAndLogin();
  const workspaceHeaders = {
    ...jsonHeaders,
    authorization: `Bearer ${auth.tokens.accessToken}`,
  };

  const kbResponse = await handleApiRequest(
    new Request("http://localhost:3001/knowledge-bases", {
      method: "POST",
      headers: workspaceHeaders,
      body: JSON.stringify({ name: "Delete KB" }),
    }),
  );
  assert.equal(kbResponse.status, 200);
  const knowledgeBase = (await kbResponse.json()) as { id: string };

  const formData = new FormData();
  formData.append(
    "files",
    new File(
      ["Private deployment includes SSO and dedicated VPC support."],
      "private-deployment.md",
      { type: "text/markdown" },
    ),
  );
  const uploadResponse = await handleApiRequest(
    new Request(`http://localhost:3001/knowledge-bases/${knowledgeBase.id}/documents`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${auth.tokens.accessToken}`,
      },
      body: formData,
    }),
  );
  assert.equal(uploadResponse.status, 200);
  const uploaded = (await uploadResponse.json()) as Array<{ id: string }>;
  const documentId = uploaded[0]?.id ?? "";
  assert.ok(documentId);

  await waitFor(
    async () => {
      const response = await handleApiRequest(
        new Request(`http://localhost:3001/documents/${documentId}`, {
          headers: workspaceHeaders,
        }),
      );
      return (await response.json()) as { status: string };
    },
    (document) => document.status === "ready",
  );

  const botResponse = await handleApiRequest(
    new Request("http://localhost:3001/bots", {
      method: "POST",
      headers: workspaceHeaders,
      body: JSON.stringify({
        name: "Delete Bot",
        status: "active",
        knowledgeBaseIds: [knowledgeBase.id],
      }),
    }),
  );
  assert.equal(botResponse.status, 200);
  const bot = (await botResponse.json()) as { id: string };

  const siteResponse = await handleApiRequest(
    new Request("http://localhost:3001/sites", {
      method: "POST",
      headers: workspaceHeaders,
      body: JSON.stringify({
        botId: bot.id,
        name: "Delete Site",
        allowedDomains: ["localhost"],
      }),
    }),
  );
  assert.equal(siteResponse.status, 200);
  const sitePayload = (await siteResponse.json()) as { revealedSiteKey: string };

  const beforeDeleteResponse = await handleApiRequest(
    new Request("http://localhost:3001/public/chat/stream", {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({
        botId: bot.id,
        siteKey: sitePayload.revealedSiteKey,
        visitorId: "visitor-delete-before",
        sdkVersion: "1.0.0",
        origin: "http://localhost:3000",
        message: "Does private deployment support SSO?",
      }),
    }),
  );
  assert.equal(beforeDeleteResponse.status, 200);
  const beforeDeleteSse = await beforeDeleteResponse.text();
  assert.match(beforeDeleteSse, /private-deployment\.md/);

  const deleteResponse = await handleApiRequest(
    new Request(`http://localhost:3001/documents/${documentId}`, {
      method: "DELETE",
      headers: workspaceHeaders,
    }),
  );
  assert.equal(deleteResponse.status, 200);
  const deleted = (await deleteResponse.json()) as {
    id: string;
    removedChunkCount: number;
    storageAction: string;
    archivedStorageKey: string | null;
  };
  assert.equal(deleted.id, documentId);
  assert.ok(deleted.removedChunkCount > 0);
  assert.equal(deleted.storageAction, "deleted");
  assert.equal(deleted.archivedStorageKey, null);

  const listResponse = await handleApiRequest(
    new Request(`http://localhost:3001/knowledge-bases/${knowledgeBase.id}/documents`, {
      headers: workspaceHeaders,
    }),
  );
  assert.equal(listResponse.status, 200);
  const documents = (await listResponse.json()) as Array<{ id: string }>;
  assert.equal(documents.length, 0);

  const getDeletedResponse = await handleApiRequest(
    new Request(`http://localhost:3001/documents/${documentId}`, {
      headers: workspaceHeaders,
    }),
  );
  assert.equal(getDeletedResponse.status, 404);

  const afterDeleteResponse = await handleApiRequest(
    new Request("http://localhost:3001/public/chat/stream", {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({
        botId: bot.id,
        siteKey: sitePayload.revealedSiteKey,
        visitorId: "visitor-delete-after",
        sdkVersion: "1.0.0",
        origin: "http://localhost:3000",
        message: "Does private deployment support SSO?",
      }),
    }),
  );
  assert.equal(afterDeleteResponse.status, 200);
  const afterDeleteSse = await afterDeleteResponse.text();
  assert.doesNotMatch(afterDeleteSse, /private-deployment\.md/);
  assert.match(afterDeleteSse, /"needsLeadCapture":true/);
});

test("protected routes reject malformed bearer token", { concurrency: false }, async () => {
  await resetTestState();
  const response = await handleApiRequest(
    new Request("http://localhost:3001/knowledge-bases", {
      headers: {
        ...jsonHeaders,
        authorization: "Bearer definitely-not-a-jwt",
      },
    }),
  );
  assert.equal(response.status, 401);
  const body = (await response.json()) as { code: string; message: string };
  assert.equal(body.code, "UNAUTHORIZED");
  assert.equal(body.message, "Invalid access token.");
});

test("protected routes reject inaccessible workspace header", { concurrency: false }, async () => {
  await resetTestState();
  const auth = await registerAndLogin();

  const response = await handleApiRequest(
    new Request("http://localhost:3001/knowledge-bases", {
      headers: {
        ...jsonHeaders,
        authorization: `Bearer ${auth.tokens.accessToken}`,
        "x-workspace-id": "ws_not_allowed",
      },
    }),
  );
  assert.equal(response.status, 401);
  const body = (await response.json()) as { code: string; message: string };
  assert.equal(body.code, "UNAUTHORIZED");
  assert.equal(body.message, "Workspace is not accessible.");
});

test("protected routes allow switching to another accessible workspace by header", { concurrency: false }, async () => {
  await resetTestState();
  const owner = await registerAndLogin();
  const invitedEmail = "switchable-member@example.com";

  const inviteResponse = await createWorkspaceInvite(owner.tokens.accessToken, {
    email: invitedEmail,
    role: "member",
  });
  assert.equal(inviteResponse.status, 200);
  const invitation = (await inviteResponse.json()) as { id: string; workspaceId: string };

  const memberAuth = await registerUser(invitedEmail, "Switchable Member");
  const acceptResponse = await handleApiRequest(
    new Request(`http://localhost:3001/workspace-invitations/${invitation.id}/accept`, {
      method: "POST",
      headers: {
        ...jsonHeaders,
        authorization: `Bearer ${memberAuth.tokens.accessToken}`,
      },
    }),
  );
  assert.equal(acceptResponse.status, 200);

  const response = await handleApiRequest(
    new Request("http://localhost:3001/workspace-members", {
      headers: {
        ...jsonHeaders,
        authorization: `Bearer ${memberAuth.tokens.accessToken}`,
        "x-workspace-id": invitation.workspaceId,
      },
    }),
  );
  assert.equal(response.status, 200);
  const members = (await response.json()) as Array<{ email: string }>;
  assert.ok(members.some((item) => item.email === invitedEmail));
});

test("auth refresh rejects malformed refresh token", { concurrency: false }, async () => {
  await resetTestState();
  const response = await handleApiRequest(
    new Request("http://localhost:3001/auth/refresh", {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({ refreshToken: "bad-refresh-token" }),
    }),
  );
  assert.equal(response.status, 401);
  const body = (await response.json()) as { code: string; message: string };
  assert.equal(body.code, "UNAUTHORIZED");
  assert.equal(body.message, "Refresh session is invalid.");
});

test("GET /health returns unified services via nest health module", { concurrency: false }, async () => {
  await resetTestState();
  const response = await handleApiRequest(
    new Request("http://localhost:3001/health", {
      method: "GET",
    }),
  );

  assert.equal(response.status, 200);
  const body = (await response.json()) as {
    status: string;
    services: Array<{ id: string }>;
    checks: { api: string };
  };
  assert.equal(body.status, "ok");
  assert.equal(body.checks.api, "ok");
  assert.ok(body.services.some((service) => service.id === "minio"));
});

test("document dead-letter routes are workspace scoped", { concurrency: false }, async () => {
  await resetTestState();
  const auth = await registerAndLogin();
  const workspaceId = auth.user.activeWorkspaceId;
  assert.ok(workspaceId);

  seedDeadLetterJobForTests({
    jobId: "dlq_job_a",
    workspaceId,
    knowledgeBaseId: "kb_a",
    documentId: "doc_a",
    storageKey: "ws/doc_a",
    fileName: "a.txt",
    fileType: "text/plain",
    sizeBytes: 10,
    queuedAt: "2026-07-01T00:00:00.000Z",
    attempts: 3,
    failedAt: "2026-07-01T01:00:00.000Z",
    errorMessage: "parser failed",
  });
  seedDeadLetterJobForTests({
    jobId: "dlq_job_b",
    workspaceId: "ws_other",
    knowledgeBaseId: "kb_b",
    documentId: "doc_b",
    storageKey: "ws/doc_b",
    fileName: "b.txt",
    fileType: "text/plain",
    sizeBytes: 10,
    queuedAt: "2026-07-01T00:00:00.000Z",
    attempts: 2,
    failedAt: "2026-07-01T01:00:00.000Z",
    errorMessage: "other workspace",
  });

  const headers = {
    ...jsonHeaders,
    authorization: `Bearer ${auth.tokens.accessToken}`,
    "x-workspace-id": workspaceId,
  };

  const listResponse = await handleApiRequest(
    new Request("http://localhost:3001/document-jobs/dead-letter", { headers }),
  );
  assert.equal(listResponse.status, 200);
  const listBody = (await listResponse.json()) as {
    available: boolean;
    total: number;
    items: Array<{ jobId: string }>;
  };
  assert.equal(listBody.available, true);
  assert.equal(listBody.total, 1);
  assert.equal(listBody.items[0]?.jobId, "dlq_job_a");

  const foreignResponse = await handleApiRequest(
    new Request("http://localhost:3001/document-jobs/dead-letter/dlq_job_b", { headers }),
  );
  assert.equal(foreignResponse.status, 404);

  const runtime = await getRuntime();
  const kb = await runtime.documentService.createKnowledgeBase({
    workspaceId,
    name: "DLQ KB",
  });
  const [document] = await runtime.documentService.uploadDocuments({
    workspaceId,
    knowledgeBaseId: kb.id,
    files: [
      {
        fileName: "retry.txt",
        fileType: "text/plain",
        sizeBytes: 8,
        contentBytes: new TextEncoder().encode("retry me"),
      },
    ],
  });
  await runtime.persist();

  seedDeadLetterJobForTests({
    jobId: "dlq_retry",
    workspaceId,
    knowledgeBaseId: kb.id,
    documentId: document.id,
    storageKey: document.storageKey,
    fileName: document.fileName,
    fileType: document.fileType,
    sizeBytes: document.sizeBytes,
    queuedAt: "2026-07-01T00:00:00.000Z",
    attempts: 3,
    failedAt: "2026-07-01T02:00:00.000Z",
    errorMessage: "index failed",
  });

  const retryResponse = await handleApiRequest(
    new Request("http://localhost:3001/document-jobs/dead-letter/dlq_retry/retry", {
      method: "POST",
      headers,
    }),
  );
  assert.equal(retryResponse.status, 200);

  const afterRetryList = await handleApiRequest(
    new Request("http://localhost:3001/document-jobs/dead-letter", { headers }),
  );
  const afterRetryBody = (await afterRetryList.json()) as { total: number };
  assert.equal(afterRetryBody.total, 1);
});

test("dead-letter retry can be reprocessed to ready status", { concurrency: false }, async () => {
  await resetTestState();
  const auth = await registerAndLogin();
  const workspaceId = auth.user.activeWorkspaceId;
  assert.ok(workspaceId);

  const runtime = await getRuntime();
  const kb = await runtime.documentService.createKnowledgeBase({
    workspaceId,
    name: "DLQ Retry KB",
  });
  const [document] = await runtime.documentService.uploadDocuments({
    workspaceId,
    knowledgeBaseId: kb.id,
    files: [
      {
        fileName: "retry-success.txt",
        fileType: "text/plain",
        sizeBytes: 22,
        contentBytes: new TextEncoder().encode("retry path can recover"),
      },
    ],
  });
  await runtime.documentService.applyWorkerStatus({
    workspaceId,
    documentId: document.id,
    status: "failed",
    errorMessage: "temporary worker outage",
  });
  await runtime.persist();

  seedDeadLetterJobForTests({
    jobId: "dlq_reprocess",
    workspaceId,
    knowledgeBaseId: kb.id,
    documentId: document.id,
    storageKey: document.storageKey,
    fileName: document.fileName,
    fileType: document.fileType,
    sizeBytes: document.sizeBytes,
    queuedAt: "2026-07-01T00:00:00.000Z",
    attempts: 3,
    failedAt: "2026-07-01T02:00:00.000Z",
    errorMessage: "temporary worker outage",
  });

  const headers = {
    ...jsonHeaders,
    authorization: `Bearer ${auth.tokens.accessToken}`,
    "x-workspace-id": workspaceId,
  };
  const retryResponse = await handleApiRequest(
    new Request("http://localhost:3001/document-jobs/dead-letter/dlq_reprocess/retry", {
      method: "POST",
      headers,
    }),
  );
  assert.equal(retryResponse.status, 200);

  const queued = listMemoryQueuedJobsForTests();
  const requeued = queued.find((job) => job.jobId === "dlq_reprocess");
  assert.ok(requeued);
  assert.equal(requeued?.attempts, 0);

  await executeDocumentJob({
    job: requeued!,
    documentService: runtime.documentService,
    ragService: runtime.ragService,
    storage: runtime.documentStorage,
    persist: async () => {
      await runtime.persist();
    },
  });

  const refreshed = await runtime.documentService.getDocument(workspaceId, document.id);
  assert.equal(refreshed.status, "ready");
  assert.ok((refreshed.chunkCount ?? 0) > 0);
});

async function loginPlatformAdmin() {
  await getRuntime();
  const loginResponse = await handleApiRequest(
    new Request("http://localhost:3001/auth/login", {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({
        email: "platform@qiyun.test",
        password: "platform-secret123",
      }),
    }),
  );
  assert.equal(loginResponse.status, 200);
  return (await loginResponse.json()) as {
    tokens: { accessToken: string };
    user: { platformRole: string | null };
  };
}

test("platform admin provisions customer workspace and admin invitation", { concurrency: false }, async () => {
  await resetTestState();
  const platform = await loginPlatformAdmin();
  assert.equal(platform.user.platformRole, "platform_admin");

  const forbiddenResponse = await handleApiRequest(
    new Request("http://localhost:3001/platform/workspaces", {
      headers: jsonHeaders,
    }),
  );
  assert.equal(forbiddenResponse.status, 401);

  const createResponse = await handleApiRequest(
    new Request("http://localhost:3001/platform/workspaces", {
      method: "POST",
      headers: {
        ...jsonHeaders,
        authorization: `Bearer ${platform.tokens.accessToken}`,
      },
      body: JSON.stringify({
        companyName: "库滋玛演示工作区",
        website: "https://demo.kuzuma.example.com",
        plan: "professional",
        contactName: "李经理",
        contactEmail: "contact@kuzuma.example.com",
        contactPhone: "13800138000",
        adminEmail: "admin@kuzuma.example.com",
      }),
    }),
  );
  assert.equal(createResponse.status, 201);
  const created = (await createResponse.json()) as {
    workspace: { id: string; name: string; plan: string };
    invitation: { email: string; status: string; inviteUrl: string };
  };
  assert.equal(created.workspace.name, "库滋玛演示工作区");
  assert.equal(created.workspace.plan, "professional");
  assert.equal(created.invitation.email, "admin@kuzuma.example.com");
  assert.equal(created.invitation.status, "pending");
  assert.match(created.invitation.inviteUrl, /accept-invite\?token=/);

  // A platform admin starts without an active tenant. Provisioning grants
  // ownership, so the first activation must work with bearer auth alone.
  const activateResponse = await handleApiRequest(
    new Request(`http://localhost:3001/workspaces/${created.workspace.id}/activate`, {
      method: "POST",
      headers: {
        ...jsonHeaders,
        authorization: `Bearer ${platform.tokens.accessToken}`,
      },
    }),
  );
  assert.equal(activateResponse.status, 200);

  const listResponse = await handleApiRequest(
    new Request("http://localhost:3001/platform/workspaces", {
      headers: {
        ...jsonHeaders,
        authorization: `Bearer ${platform.tokens.accessToken}`,
      },
    }),
  );
  assert.equal(listResponse.status, 200);
  const list = (await listResponse.json()) as Array<{ name: string }>;
  assert.ok(list.some((item) => item.name === "库滋玛演示工作区"));
});

test("trial request can be submitted and approved by platform admin", { concurrency: false }, async () => {
  await resetTestState();

  const submitResponse = await handleApiRequest(
    new Request("http://localhost:3001/trial-requests", {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({
        companyName: "星河工业",
        contactName: "王敏",
        email: "trial@xinghe.example.com",
        phone: "13800112233",
        website: "https://xinghe.example.com",
        requirement: "需要官网 AI 客服与线索收集方案。",
        requestedPlan: "enterprise",
      }),
    }),
  );
  assert.equal(submitResponse.status, 200);
  const submitted = (await submitResponse.json()) as {
    id: string;
    status: string;
    requestedPlan: string;
  };
  assert.equal(submitted.status, "pending");
  assert.equal(submitted.requestedPlan, "enterprise");

  const platform = await loginPlatformAdmin();
  const listResponse = await handleApiRequest(
    new Request("http://localhost:3001/platform/trial-requests", {
      headers: {
        ...jsonHeaders,
        authorization: `Bearer ${platform.tokens.accessToken}`,
      },
    }),
  );
  assert.equal(listResponse.status, 200);
  const list = (await listResponse.json()) as Array<{
    id: string;
    companyName: string;
    status: string;
    requestedPlan: string;
  }>;
  assert.ok(
    list.some(
      (item) =>
        item.id === submitted.id && item.companyName === "星河工业" && item.requestedPlan === "enterprise",
    ),
  );

  const reviewResponse = await handleApiRequest(
    new Request(`http://localhost:3001/platform/trial-requests/${submitted.id}`, {
      method: "PATCH",
      headers: {
        ...jsonHeaders,
        authorization: `Bearer ${platform.tokens.accessToken}`,
      },
      body: JSON.stringify({
        action: "approve",
        plan: "professional",
        adminEmail: "admin@xinghe.example.com",
        reviewNotes: "官网场景匹配，安排专业版试用。",
      }),
    }),
  );
  assert.equal(reviewResponse.status, 200);
  const reviewed = (await reviewResponse.json()) as {
    status: string;
    approvedWorkspace: { name: string; inviteEmail: string | null } | null;
  };
  assert.equal(reviewed.status, "approved");
  assert.equal(reviewed.approvedWorkspace?.name, "星河工业");
  assert.equal(reviewed.approvedWorkspace?.inviteEmail, "admin@xinghe.example.com");

  const workspaceListResponse = await handleApiRequest(
    new Request("http://localhost:3001/platform/workspaces", {
      headers: {
        ...jsonHeaders,
        authorization: `Bearer ${platform.tokens.accessToken}`,
      },
    }),
  );
  assert.equal(workspaceListResponse.status, 200);
  const workspaces = (await workspaceListResponse.json()) as Array<{ name: string }>;
  assert.ok(workspaces.some((item) => item.name === "星河工业"));
});

test("trial request can be rejected by platform admin", { concurrency: false }, async () => {
  await resetTestState();

  const submitResponse = await handleApiRequest(
    new Request("http://localhost:3001/trial-requests", {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({
        companyName: "演示待筛选客户",
        contactName: "赵磊",
        email: "screening@example.com",
      }),
    }),
  );
  assert.equal(submitResponse.status, 200);
  const submitted = (await submitResponse.json()) as { id: string };

  const platform = await loginPlatformAdmin();
  const reviewResponse = await handleApiRequest(
    new Request(`http://localhost:3001/platform/trial-requests/${submitted.id}`, {
      method: "PATCH",
      headers: {
        ...jsonHeaders,
        authorization: `Bearer ${platform.tokens.accessToken}`,
      },
      body: JSON.stringify({
        action: "reject",
        reviewNotes: "当前行业场景暂不在首批支持范围内。",
      }),
    }),
  );
  assert.equal(reviewResponse.status, 200);
  const reviewed = (await reviewResponse.json()) as {
    status: string;
    reviewNotes: string | null;
    approvedWorkspace: unknown;
  };
  assert.equal(reviewed.status, "rejected");
  assert.equal(reviewed.reviewNotes, "当前行业场景暂不在首批支持范围内。");
  assert.equal(reviewed.approvedWorkspace, null);
});

test("notifications feed aggregates leads, document failures, and invite delivery failures", { concurrency: false }, async () => {
  await resetTestState();
  const owner = await registerAndLogin();
  const { bot, site, headers } = await createBotAndSite(owner.tokens.accessToken);

  const chatResponse = await handleApiRequest(
    new Request("http://localhost:3001/public/chat/stream", {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({
        botId: bot.id,
        siteKey: site.siteKey,
        visitorId: "notify-visitor",
        sdkVersion: "1.0.0",
        origin: "http://localhost:3000",
        message: "Need a quote and lead time.",
      }),
    }),
  );
  assert.equal(chatResponse.status, 200);
  const eventText = await chatResponse.text();
  const metaLine = eventText
    .split("\n")
    .find((line) => line.startsWith("data: {\"conversationId\""));
  const conversationId = metaLine
    ? (JSON.parse(metaLine.replace("data: ", "")) as { conversationId: string }).conversationId
    : "";
  assert.ok(conversationId);

  const leadCreateResponse = await handleApiRequest(
    new Request("http://localhost:3001/public/leads", {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({
        botId: bot.id,
        siteKey: site.siteKey,
        conversationId,
        fields: {
          name: "Notify Prospect",
          email: "notify@example.com",
          company: "Notify Co",
          requirement: "Need a pricing quote",
        },
      }),
    }),
  );
  assert.equal(leadCreateResponse.status, 200);

  const kbResponse = await handleApiRequest(
    new Request("http://localhost:3001/knowledge-bases", {
      method: "POST",
      headers,
      body: JSON.stringify({ name: "Notify KB" }),
    }),
  );
  assert.equal(kbResponse.status, 200);
  const kb = (await kbResponse.json()) as { id: string };

  const formData = new FormData();
  formData.set(
    "files",
    new File(["%PDF-1.4\n%%EOF"], "notify-scan.pdf", {
      type: "application/pdf",
    }),
  );
  const uploadResponse = await handleApiRequest(
    new Request(`http://localhost:3001/knowledge-bases/${kb.id}/documents`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${owner.tokens.accessToken}`,
      },
      body: formData,
    }),
  );
  assert.equal(uploadResponse.status, 200);
  const uploaded = (await uploadResponse.json()) as Array<{ id: string }>;
  const documentId = uploaded[0]?.id ?? "";
  assert.ok(documentId);

  const failedDocument = await waitFor(
    async () =>
      handleApiRequest(
        new Request(`http://localhost:3001/documents/${documentId}`, {
          headers,
        }),
      ).then((response) => response.json() as Promise<{ status: string }>),
    (document) => document.status === "failed",
  );
  assert.equal(failedDocument.status, "failed");

  const inviteResponse = await createWorkspaceInvite(owner.tokens.accessToken, {
    email: "broken-delivery@example.com",
    role: "viewer",
  });
  assert.equal(inviteResponse.status, 200);
  const invitation = (await inviteResponse.json()) as { id: string };

  const runtime = await getRuntime();
  runtime.invitationAuditStore.record({
    id: "audit_failed_notify",
    invitationId: invitation.id,
    recipientEmail: "broken-delivery@example.com",
    provider: "resend",
    attempt: 1,
    status: "failed",
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    errorMessage: "SMTP timeout",
  });

  const notificationsResponse = await handleApiRequest(
    new Request("http://localhost:3001/notifications", {
      headers,
    }),
  );
  assert.equal(notificationsResponse.status, 200);
  const notifications = (await notificationsResponse.json()) as {
    unreadCount: number;
    items: Array<{ id: string; kind: string; title: string }>;
  };
  assert.ok(notifications.unreadCount >= 1);
  assert.ok(notifications.items.some((item) => item.id.startsWith("lead:")));
  assert.ok(notifications.items.some((item) => item.id.startsWith("document:")));
  assert.ok(notifications.items.some((item) => item.id.startsWith("invite-audit:")));

  const documentItem = notifications.items.find((item) => item.id.startsWith("document:"));
  assert.equal(documentItem?.kind, "document");
  const inviteItem = notifications.items.find((item) => item.id.startsWith("invite-audit:"));
  assert.equal(inviteItem?.kind, "invite");

  const leadItem = notifications.items.find((item) => item.id.startsWith("lead:"));
  assert.ok(leadItem?.id);

  const markOneResponse = await handleApiRequest(
    new Request("http://localhost:3001/notifications/read", {
      method: "POST",
      headers: {
        ...jsonHeaders,
        authorization: `Bearer ${owner.tokens.accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ ids: [leadItem!.id] }),
    }),
  );
  assert.equal(markOneResponse.status, 200);
  const markOne = (await markOneResponse.json()) as {
    ok: boolean;
    markedIds: string[];
    unreadCount: number;
  };
  assert.equal(markOne.ok, true);
  assert.ok(markOne.markedIds.includes(leadItem!.id));
  assert.ok(markOne.unreadCount < notifications.unreadCount);

  const afterOneResponse = await handleApiRequest(
    new Request("http://localhost:3001/notifications", { headers }),
  );
  const afterOne = (await afterOneResponse.json()) as {
    items: Array<{ id: string; unread: boolean }>;
  };
  assert.equal(afterOne.items.find((item) => item.id === leadItem!.id)?.unread, false);

  const markAllResponse = await handleApiRequest(
    new Request("http://localhost:3001/notifications/read", {
      method: "POST",
      headers: {
        ...jsonHeaders,
        authorization: `Bearer ${owner.tokens.accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ all: true }),
    }),
  );
  assert.equal(markAllResponse.status, 200);
  const markAll = (await markAllResponse.json()) as { unreadCount: number };
  assert.equal(markAll.unreadCount, 0);
});

test("pre-uploaded lead attachment is referenced, attached to the lead, and downloadable", { concurrency: false }, async () => {
  await resetTestState();
  const auth = await registerAndLogin();
  const { bot, site, headers: workspaceHeaders } = await createBotAndSite(auth.tokens.accessToken);

  const chatResponse = await handleApiRequest(
    new Request("http://localhost:3001/public/chat/stream", {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({
        botId: bot.id,
        siteKey: site.siteKey,
        visitorId: "visitor-preupload",
        sdkVersion: "1.0.0",
        origin: "http://localhost:3000",
        message: "Send me a quote for a custom chiller.",
      }),
    }),
  );
  assert.equal(chatResponse.status, 200);
  const eventText = await chatResponse.text();
  const metaLine = eventText
    .split("\n")
    .find((line) => line.startsWith("data: {\"conversationId\""));
  const conversationId = metaLine
    ? (JSON.parse(metaLine.replace("data: ", "")) as { conversationId: string }).conversationId
    : "";
  assert.ok(conversationId);

  // 1) Pre-upload the attachment (public, no login) and receive a reference id.
  const preUploadForm = new FormData();
  preUploadForm.set("botId", bot.id);
  preUploadForm.set("siteKey", site.siteKey);
  preUploadForm.append(
    "file",
    new File([new TextEncoder().encode("preupload-bytes")], "pre-upload.pdf", {
      type: "application/pdf",
    }),
  );
  const preUploadResponse = await handleApiRequest(
    new Request("http://localhost:3001/public/leads/attachments", {
      method: "POST",
      body: preUploadForm,
    }),
  );
  assert.equal(preUploadResponse.status, 200);
  const preUploadRef = (await preUploadResponse.json()) as {
    id: string;
    fileName: string;
    fileType: string;
    downloadUrl: string;
  };
  assert.ok(preUploadRef.id);
  assert.equal(preUploadRef.fileName, "pre-upload.pdf");
  assert.match(preUploadRef.downloadUrl, /\/public\/leads\/attachments\//);

  // 2) The pending attachment is publicly downloadable before it is consumed.
  const pendingDownloadResponse = await handleApiRequest(
    new Request(`http://localhost:3001/public/leads/attachments/${preUploadRef.id}`),
  );
  assert.equal(pendingDownloadResponse.status, 200);
  assert.equal(pendingDownloadResponse.headers.get("content-type"), "application/pdf");
  const pendingBytes = new TextDecoder().decode(new Uint8Array(await pendingDownloadResponse.arrayBuffer()));
  assert.equal(pendingBytes, "preupload-bytes");

  // 3) Reference the pre-uploaded attachment when creating the lead.
  const leadCreateResponse = await handleApiRequest(
    new Request("http://localhost:3001/public/leads", {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({
        botId: bot.id,
        siteKey: site.siteKey,
        conversationId,
        pendingAttachmentIds: [preUploadRef.id],
        fields: {
          name: "Preupload Lead",
          email: "preupload@example.com",
          company: "Preupload Co",
          requirement: "Need a quote with the attached spec.",
        },
      }),
    }),
  );
  assert.equal(leadCreateResponse.status, 200);
  const createdLead = (await leadCreateResponse.json()) as {
    id: string;
    attachments: Array<{ id: string; fileName: string; fileType: string }>;
  };
  assert.equal(createdLead.attachments.length, 1);
  assert.equal(createdLead.attachments[0]?.fileName, "pre-upload.pdf");

  // 4) The attachment is now served through the authenticated lead attachment endpoint.
  const leadDetailResponse = await handleApiRequest(
    new Request(`http://localhost:3001/leads/${createdLead.id}`, {
      headers: workspaceHeaders,
    }),
  );
  assert.equal(leadDetailResponse.status, 200);
  const leadDetail = (await leadDetailResponse.json()) as {
    attachments: Array<{ id: string; fileName: string; fileType: string; sizeBytes: number }>;
  };
  assert.equal(leadDetail.attachments.length, 1);
  const attachmentId = leadDetail.attachments[0]?.id ?? "";
  assert.ok(attachmentId);

  const downloadResponse = await handleApiRequest(
    new Request(`http://localhost:3001/leads/${createdLead.id}/attachments/${attachmentId}`, {
      headers: workspaceHeaders,
    }),
  );
  assert.equal(downloadResponse.status, 200);
  assert.equal(downloadResponse.headers.get("content-type"), "application/pdf");
  const downloadedBytes = new TextDecoder().decode(new Uint8Array(await downloadResponse.arrayBuffer()));
  assert.equal(downloadedBytes, "preupload-bytes");

  // 5) The pending record is consumed: the public pending endpoint now 404s.
  const consumedResponse = await handleApiRequest(
    new Request(`http://localhost:3001/public/leads/attachments/${preUploadRef.id}`),
  );
  assert.equal(consumedResponse.status, 404);
});

test("quote public token route issues a real token and public quote endpoints resolve by token", { concurrency: false }, async () => {
  await resetTestState();
  const auth = await registerAndLogin();
  const workspaceHeaders = {
    ...jsonHeaders,
    authorization: `Bearer ${auth.tokens.accessToken}`,
  };

  const inquiryResponse = await handleApiRequest(
    new Request("http://localhost:3001/inquiries", {
      method: "POST",
      headers: workspaceHeaders,
      body: JSON.stringify({
        customerName: "Public Quote Customer",
        sourceType: "website",
        summary: "Need cabinet quote",
      }),
    }),
  );
  assert.equal(inquiryResponse.status, 200);
  const inquiry = (await inquiryResponse.json()) as { id: string };
  assert.ok(inquiry.id);

  const quoteResponse = await handleApiRequest(
    new Request("http://localhost:3001/quote-opportunities", {
      method: "POST",
      headers: workspaceHeaders,
      body: JSON.stringify({
        inquiryId: inquiry.id,
        title: "Public Quote",
        estimatedAmount: 12800,
      }),
    }),
  );
  assert.equal(quoteResponse.status, 200);
  const quote = (await quoteResponse.json()) as { id: string; title: string };
  assert.ok(quote.id);

  const publicTokenResponse = await handleApiRequest(
    new Request(`http://localhost:3001/quote-opportunities/${quote.id}/public-token`, {
      method: "POST",
      headers: workspaceHeaders,
    }),
  );
  assert.equal(publicTokenResponse.status, 200);
  const publicToken = (await publicTokenResponse.json()) as {
    quoteId: string;
    token: string;
    tokenPrefix: string;
    url: string;
  };
  assert.equal(publicToken.quoteId, quote.id);
  assert.notEqual(publicToken.token, quote.id);
  assert.match(publicToken.token, /^qpk_/);
  assert.match(publicToken.url, /\/public\/quotes\/qpk_/);

  const publicQuoteResponse = await handleApiRequest(
    new Request(`http://localhost:3001/public/quotes/${encodeURIComponent(publicToken.token)}`),
  );
  assert.equal(publicQuoteResponse.status, 200);
  const publicQuote = (await publicQuoteResponse.json()) as {
    id: string;
    title: string;
    publicTokenPrefix: string;
    publicConfirmedAt: string | null;
    document?: { html: string; sample: { quoteNo: string } };
  };
  assert.equal(publicQuote.id, quote.id);
  assert.equal(publicQuote.title, "Public Quote");
  assert.equal(publicQuote.publicTokenPrefix, publicToken.tokenPrefix);
  assert.equal(publicQuote.publicConfirmedAt, null);
  assert.ok(publicQuote.document?.html.includes("报价单"));
  assert.ok(publicQuote.document?.sample.quoteNo);

  const confirmResponse = await handleApiRequest(
    new Request(`http://localhost:3001/public/quotes/${encodeURIComponent(publicToken.token)}/confirm`, {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({ action: "approved" }),
    }),
  );
  assert.equal(confirmResponse.status, 200);
  const confirm = (await confirmResponse.json()) as {
    ok: boolean;
    action: string;
    confirmedAt: string;
  };
  assert.equal(confirm.ok, true);
  assert.equal(confirm.action, "approved");
  assert.ok(confirm.confirmedAt);

  const publicQuoteAfterConfirmResponse = await handleApiRequest(
    new Request(`http://localhost:3001/public/quotes/${encodeURIComponent(publicToken.token)}`),
  );
  assert.equal(publicQuoteAfterConfirmResponse.status, 200);
  const publicQuoteAfterConfirm = (await publicQuoteAfterConfirmResponse.json()) as {
    publicConfirmedAt: string | null;
    followUps: Array<{ actor?: string | null; body?: string | null }>;
  };
  assert.ok(publicQuoteAfterConfirm.publicConfirmedAt);
  assert.ok(
    publicQuoteAfterConfirm.followUps.some(
      (item) => item.actor === "public_quote" && item.body?.includes("approved"),
    ),
  );

  const fakeTokenResponse = await handleApiRequest(
    new Request(`http://localhost:3001/public/quotes/${quote.id}`),
  );
  assert.equal(fakeTokenResponse.status, 404);
});

test("quote template routes support CRUD preview and quote document", { concurrency: false }, async () => {
  await resetTestState();
  const auth = await registerAndLogin();
  const workspaceHeaders = {
    ...jsonHeaders,
    authorization: `Bearer ${auth.tokens.accessToken}`,
  };

  const listResponse = await handleApiRequest(
    new Request("http://localhost:3001/quote-templates", { headers: workspaceHeaders }),
  );
  assert.equal(listResponse.status, 200);
  const seeded = (await listResponse.json()) as Array<{ id: string; isDefault: boolean }>;
  assert.ok(seeded.length >= 1);
  assert.ok(seeded.some((item) => item.isDefault));

  const createResponse = await handleApiRequest(
    new Request("http://localhost:3001/quote-templates", {
      method: "POST",
      headers: workspaceHeaders,
      body: JSON.stringify({
        templateName: "测试模板",
        companyName: "测试企业",
        themeColor: "#0ea5e9",
      }),
    }),
  );
  assert.equal(createResponse.status, 200);
  const created = (await createResponse.json()) as { id: string; templateName: string };
  assert.equal(created.templateName, "测试模板");

  const previewResponse = await handleApiRequest(
    new Request(`http://localhost:3001/quote-templates/${created.id}/preview`, {
      headers: workspaceHeaders,
    }),
  );
  assert.equal(previewResponse.status, 200);
  const preview = (await previewResponse.json()) as { html: string; sample: { quoteNo: string } };
  assert.ok(preview.html.includes("报价单"));
  assert.ok(preview.sample.quoteNo);

  const inquiryResponse = await handleApiRequest(
    new Request("http://localhost:3001/inquiries", {
      method: "POST",
      headers: workspaceHeaders,
      body: JSON.stringify({
        customerName: "Template Quote Customer",
        sourceType: "website",
        summary: "Need template quote",
      }),
    }),
  );
  assert.equal(inquiryResponse.status, 200);
  const inquiry = (await inquiryResponse.json()) as { id: string };

  const quoteResponse = await handleApiRequest(
    new Request("http://localhost:3001/quote-opportunities", {
      method: "POST",
      headers: workspaceHeaders,
      body: JSON.stringify({
        inquiryId: inquiry.id,
        title: "Template Document Quote",
        estimatedAmount: 52000,
        templateId: created.id,
      }),
    }),
  );
  assert.equal(quoteResponse.status, 200);
  const quote = (await quoteResponse.json()) as { id: string; templateId: string | null };
  assert.equal(quote.templateId, created.id);

  const documentResponse = await handleApiRequest(
    new Request(`http://localhost:3001/quote-opportunities/${quote.id}/document`, {
      headers: workspaceHeaders,
    }),
  );
  assert.equal(documentResponse.status, 200);
  const document = (await documentResponse.json()) as {
    html: string;
    template: { templateName: string };
    sample: { customer: { name: string } };
  };
  assert.equal(document.template.templateName, "测试模板");
  assert.equal(document.sample.customer.name, "Template Quote Customer");
  assert.ok(document.html.includes("测试企业"));

  const documentHtmlResponse = await handleApiRequest(
    new Request(`http://localhost:3001/quote-opportunities/${quote.id}/document.html`, {
      headers: workspaceHeaders,
    }),
  );
  assert.equal(documentHtmlResponse.status, 200);
  assert.equal(documentHtmlResponse.headers.get("content-type"), "text/html; charset=utf-8");
  const htmlText = await documentHtmlResponse.text();
  assert.ok(htmlText.includes("报价单"));

  const setDefaultResponse = await handleApiRequest(
    new Request(`http://localhost:3001/quote-templates/${created.id}/set-default`, {
      method: "POST",
      headers: workspaceHeaders,
    }),
  );
  assert.equal(setDefaultResponse.status, 200);
  const defaulted = (await setDefaultResponse.json()) as { id: string; isDefault: boolean };
  assert.equal(defaulted.id, created.id);
  assert.equal(defaulted.isDefault, true);

  const deleteResponse = await handleApiRequest(
    new Request(`http://localhost:3001/quote-templates/${created.id}`, {
      method: "DELETE",
      headers: workspaceHeaders,
    }),
  );
  assert.equal(deleteResponse.status, 200);
});

test("audit logs list records inquiry writes with readable summaries", { concurrency: false }, async () => {
  await resetTestState();
  const auth = await registerAndLogin();
  const workspaceHeaders = {
    ...jsonHeaders,
    authorization: `Bearer ${auth.tokens.accessToken}`,
  };

  const inquiryResponse = await handleApiRequest(
    new Request("http://localhost:3001/inquiries", {
      method: "POST",
      headers: workspaceHeaders,
      body: JSON.stringify({
        customerName: "Audit Trail Customer",
        sourceType: "website",
        summary: "Need audit log coverage",
      }),
    }),
  );
  assert.equal(inquiryResponse.status, 200);
  const inquiry = (await inquiryResponse.json()) as { id: string };
  assert.ok(inquiry.id);

  const logsResponse = await handleApiRequest(
    new Request("http://localhost:3001/audit-logs", { headers: workspaceHeaders }),
  );
  assert.equal(logsResponse.status, 200);
  const logs = (await logsResponse.json()) as Array<{
    module: string;
    action: string;
    targetId: string | null;
    moduleLabel: string;
    actionLabel: string;
    summary: string;
  }>;
  assert.ok(logs.length >= 1);
  const created = logs.find((entry) => entry.module === "inquiry" && entry.action === "create");
  assert.ok(created);
  assert.equal(created.targetId, inquiry.id);
  assert.equal(created.moduleLabel, "询盘");
  assert.equal(created.actionLabel, "创建");
  assert.match(created.summary, /询盘 · 创建/);

  const filteredResponse = await handleApiRequest(
    new Request("http://localhost:3001/audit-logs?module=inquiry", { headers: workspaceHeaders }),
  );
  assert.equal(filteredResponse.status, 200);
  const filtered = (await filteredResponse.json()) as Array<{ module: string }>;
  assert.ok(filtered.every((entry) => entry.module === "inquiry"));
});
