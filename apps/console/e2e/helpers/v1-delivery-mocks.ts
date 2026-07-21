import type { Page } from "@playwright/test";

import { mockAuthLoginSuccess, mockAuthSession } from "./auth-mock.mjs";
import { upstreamMode } from "./mock-api";

export type WorkspaceRole = "owner" | "admin" | "member";

export const ROLE_HOME = {
  owner: "/dashboard/boss",
  admin: "/dashboard/admin",
  member: "/dashboard/sales-rep",
} as const;

export const ROLE_HOME_HREFS = Object.values(ROLE_HOME);

export function sessionForRole(role: WorkspaceRole) {
  return {
    authenticated: true,
    user: {
      id: `user_e2e_${role}`,
      email: `${role}@qiyun.ai`,
      name: `E2E ${role}`,
      activeWorkspaceId: "ws_e2e",
    },
    workspaces: [
      {
        id: "ws_e2e",
        name: "E2E Workspace",
        slug: "e2e",
        role,
        isActive: true,
      },
    ],
  };
}

export async function mockRoleLogin(page: Page, role: WorkspaceRole) {
  await mockAuthLoginSuccess(page, sessionForRole(role));
}

export async function loginAsRole(page: Page, role: WorkspaceRole) {
  await mockRoleLogin(page, role);
  await page.goto("/login");
  await page.waitForLoadState("networkidle");
  await page.getByPlaceholder("\u8bf7\u8f93\u5165\u5de5\u4f5c\u90ae\u7bb1").fill(`${role}@qiyun.ai`);
  await page.getByPlaceholder("\u8bf7\u8f93\u5165\u767b\u5f55\u5bc6\u7801").fill("secret123");
  await page.locator('label:has-text("\u7528\u6237\u534f\u8bae") input[type="checkbox"]').check();
  await page.getByRole("button", { name: "\u767b\u5f55", exact: true }).click();
  await page.waitForURL(new RegExp(ROLE_HOME[role].replace(/\//g, "\\/")), {
    timeout: 20_000,
  });
}

export async function installRoleSession(
  page: Page,
  role: WorkspaceRole,
  baseURL = "http://localhost:3000",
) {
  const session = sessionForRole(role);
  await page.route("**/api/auth/session*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(session),
    });
  });
  const hostname = new URL(baseURL).hostname;
  await page.context().addCookies([
    {
      name: "qiyun_auth_user",
      value: encodeURIComponent(JSON.stringify(session.user)),
      domain: hostname,
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
    {
      name: "qiyun_access_token",
      value: `e2e-token-${role}`,
      domain: hostname,
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
    {
      name: "qiyun_refresh_token",
      value: `e2e-refresh-${role}`,
      domain: hostname,
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}

function json(body: unknown, status = 200) {
  return {
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  };
}

export async function mockUpstreamMode(page: Page) {
  await page.route("**/api/console/mode", async (route) => {
    await route.fulfill(json(upstreamMode));
  });
}

export async function mockSelectionSubmitCreatesInquiry(page: Page) {
  const inquiryId = "inq_e2e_selection_001";
  await page.route("**/api/selection-pages/public/*/submit", async (route) => {
    const postData = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill(
      json({
        ok: true,
        inquiryId,
        leadId: "lead_e2e_selection_001",
        submissionId: "sub_e2e_001",
        received: postData,
      }),
    );
  });
  return inquiryId;
}

export async function mockInquiryAssignAndStatus(page: Page) {
  const inquiry = {
    id: "inq_e2e_assign_001",
    conversationId: "conv_e2e_001",
    leadId: "lead_e2e_001",
    botId: "bot_e2e",
    botName: "Website Bot",
    customerName: "East China Zhang",
    customerContact: "Zhang",
    sourceCode: "wechat_official_account",
    sourceType: "wechat",
    intentLevel: "high",
    requirementCompleteness: 70,
    summary: "Need chiller quote",
    missingFields: [] as string[],
    needsEngineer: false,
    ownerId: null as string | null,
    nextActionAt: null as string | null,
    quoteStatus: "to_quote",
    status: "open",
    updatedAt: "2026-07-21T08:00:00.000Z",
    createdAt: "2026-07-21T07:00:00.000Z",
    riskNotes: [] as string[],
    knownFields: { company: "East China Mfg" },
    messages: [] as unknown[],
    attachments: [] as unknown[],
    aiInsight: null,
    quoteOpportunities: [] as unknown[],
  };

  const candidates = [
    {
      userId: "user_sales_001",
      name: "Li Sales",
      email: "li@qiyun.ai",
      role: "member",
      currentLoad: 2,
      maxCapacity: 10,
      loadRate: 20,
      matchScore: 92,
      status: "idle",
      reason: "Idle and high match",
      recommended: true,
    },
  ];

  await page.route((url) => url.pathname.includes("/api/inquiries"), async (route) => {
    const request = route.request();
    const method = request.method();
    const pathname = new URL(request.url()).pathname;

    if (pathname.endsWith("/assign-stats") && method === "GET") {
      await route.fulfill(
        json({
          unassignedCount: 1,
          todayNewCount: 1,
          highPriorityUnassignedCount: 1,
          avgAssignMinutes: 12,
          assignedOpenCount: 0,
          monthAssignedTotal: 3,
        }),
      );
      return;
    }

    if (pathname.endsWith("/assign-candidates") && method === "GET") {
      await route.fulfill(json(candidates));
      return;
    }

    if (pathname.endsWith(`/inquiries/${inquiry.id}/assign`) && method === "POST") {
      const body = request.postDataJSON() as { ownerId?: string };
      await route.fulfill(json({ ...inquiry, ownerId: body.ownerId ?? candidates[0].userId }));
      return;
    }

    if (pathname.endsWith(`/inquiries/${inquiry.id}/lost`) && method === "POST") {
      await route.fulfill(
        json({ ...inquiry, status: "closed", quoteStatus: "lost", ownerId: "user_sales_001" }),
      );
      return;
    }

    if (pathname.endsWith(`/inquiries/${inquiry.id}`) && method === "GET") {
      await route.fulfill(json({ ...inquiry, ownerId: null }));
      return;
    }

    if (pathname.endsWith(`/inquiries/${inquiry.id}`) && method === "PATCH") {
      const patch = request.postDataJSON() as { status?: string };
      await route.fulfill(json({ ...inquiry, ...patch, ownerId: "user_sales_001" }));
      return;
    }

    if (pathname.endsWith("/inquiries") && method === "GET") {
      await route.fulfill(json([inquiry]));
      return;
    }

    await route.fallback();
  });

  return { inquiry, candidates };
}

export async function mockFollowTaskCreate(page: Page) {
  await page.route("**/api/follow-tasks**", async (route) => {
    if (route.request().method() === "POST") {
      const body = route.request().postDataJSON() as { title?: string; dueAt?: string };
      await route.fulfill(
        json({
          id: "task_e2e_001",
          title: body.title ?? "E2E follow task",
          start: body.dueAt ?? new Date().toISOString(),
          end: body.dueAt ?? new Date().toISOString(),
          kind: "follow_up",
          status: "pending",
        }),
      );
      return;
    }
    await route.fulfill(json([]));
  });
}

export async function mockInquiryToQuote(page: Page, inquiryId = "inq_e2e_quote_001") {
  const detail = {
    id: inquiryId,
    conversationId: "conv_e2e_quote",
    leadId: "lead_e2e_quote",
    botId: "bot_e2e",
    botName: "Website Bot",
    customerName: "Quote Customer",
    customerContact: "Zhao",
    sourceCode: "website",
    sourceType: "website",
    intentLevel: "high",
    requirementCompleteness: 80,
    summary: "Inquiry ready for quote",
    missingFields: [] as string[],
    needsEngineer: false,
    ownerId: "user_sales_001",
    nextActionAt: null as string | null,
    quoteStatus: "to_quote",
    status: "open",
    updatedAt: "2026-07-21T08:00:00.000Z",
    createdAt: "2026-07-21T07:00:00.000Z",
    riskNotes: [] as string[],
    knownFields: { company: "Quote Co" },
    messages: [] as unknown[],
    attachments: [] as unknown[],
    aiInsight: null,
    quoteOpportunities: [] as unknown[],
  };

  await page.route(`**/api/inquiries/${inquiryId}`, async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill(json(detail));
      return;
    }
    if (route.request().method() === "PATCH") {
      const patch = route.request().postDataJSON() as Record<string, unknown>;
      await route.fulfill(json({ ...detail, ...patch }));
      return;
    }
    await route.fallback();
  });

  await page.route(`**/api/inquiries/${inquiryId}/lost`, async (route) => {
    await route.fulfill(json({ ...detail, status: "closed", quoteStatus: "lost" }));
  });

  await page.route(`**/api/inquiries/${inquiryId}/convert-to-quote`, async (route) => {
    await route.fulfill(
      json({
        id: "quote_e2e_001",
        inquiryId,
        title: "E2E Quote",
        status: "draft",
        currency: "CNY",
        totalAmount: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
    );
  });

  await page.route("**/api/quotes/quote_e2e_001**", async (route) => {
    await route.fulfill(
      json({
        id: "quote_e2e_001",
        inquiryId,
        title: "E2E Quote",
        status: "draft",
        currency: "CNY",
        totalAmount: null,
        lineItems: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
    );
  });
}

export async function mockKnowledgeUploadStatuses(page: Page) {
  const base = {
    id: "kb_e2e_001",
    workspaceId: "ws_e2e",
    name: "E2E Knowledge Base",
    status: "active",
    documentCount: 3,
    readyDocumentCount: 1,
    failedDocumentCount: 1,
    createdAt: "2026-07-20T00:00:00.000Z",
    updatedAt: "2026-07-21T00:00:00.000Z",
  };
  const documents = [
    {
      id: "doc_ready",
      workspaceId: "ws_e2e",
      knowledgeBaseId: base.id,
      fileName: "manual.pdf",
      fileType: "pdf",
      storageKey: "s3://ready",
      sizeBytes: 1000,
      status: "ready",
      chunkCount: 12,
      errorCode: null,
      errorMessage: null,
      createdAt: "2026-07-20T00:00:00.000Z",
      updatedAt: "2026-07-20T01:00:00.000Z",
      deletedAt: null,
    },
    {
      id: "doc_parsing",
      workspaceId: "ws_e2e",
      knowledgeBaseId: base.id,
      fileName: "spec.docx",
      fileType: "docx",
      storageKey: "s3://parsing",
      sizeBytes: 800,
      status: "parsing",
      chunkCount: null,
      errorCode: null,
      errorMessage: null,
      createdAt: "2026-07-21T00:00:00.000Z",
      updatedAt: "2026-07-21T00:10:00.000Z",
      deletedAt: null,
    },
    {
      id: "doc_failed",
      workspaceId: "ws_e2e",
      knowledgeBaseId: base.id,
      fileName: "bad.bin",
      fileType: "bin",
      storageKey: "s3://failed",
      sizeBytes: 10,
      status: "failed",
      chunkCount: null,
      errorCode: "unsupported_file_type",
      errorMessage: "unsupported",
      createdAt: "2026-07-21T00:00:00.000Z",
      updatedAt: "2026-07-21T00:05:00.000Z",
      deletedAt: null,
    },
  ];

  await page.route("**/api/knowledge-bases", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill(json([base]));
      return;
    }
    await route.fallback();
  });
  await page.route(`**/api/knowledge-bases/${base.id}`, async (route) => {
    await route.fulfill(json(base));
  });
  await page.route(`**/api/knowledge-bases/${base.id}/documents**`, async (route) => {
    await route.fulfill(json(documents));
  });

  return { base, documents };
}

export { mockAuthSession };
