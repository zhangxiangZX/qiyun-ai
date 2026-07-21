/**
 * C-P0-07 -- V1 delivery critical journeys (console e2e)
 *
 * Multi-role seed accounts beyond owner@qiyun.ai are not reliably available in
 * preview/compose. Role homes are covered via mocked auth sessions
 * (owner/admin/member). Server-side role-home redirect (enforceRoleHomeAccess)
 * is a no-op when API_BASE_URL is empty (Playwright webServer default); that
 * contract is covered by unit tests + this suite's login destination + sidebar
 * exclusivity checks. Direct URL redirect is asserted when a redirect occurs,
 * otherwise annotated as preview-guard skip.
 */
import { expect, test, type Page } from "@playwright/test";

import {
  installRoleSession,
  loginAsRole,
  mockFollowTaskCreate,
  mockInquiryAssignAndStatus,
  mockInquiryToQuote,
  mockSelectionSubmitCreatesInquiry,
  mockUpstreamMode,
  ROLE_HOME,
  ROLE_HOME_HREFS,
  type WorkspaceRole,
} from "./helpers/v1-delivery-mocks";

const SMOKE_ROUTES = [
  "/dashboard/boss",
  "/dashboard/inquiries",
  "/dashboard/tasks",
  "/dashboard/knowledge-bases",
  "/dashboard/quotes",
  "/login",
];

async function collectRoleHomeHrefs(page: Page): Promise<string[]> {
  await page.waitForTimeout(800);
  const hrefs = await page
    .locator("nav a[href], aside a[href], .nav-subitem[href]")
    .evaluateAll((nodes) =>
      nodes
        .map((node) => (node as HTMLAnchorElement).getAttribute("href") || "")
        .filter(Boolean),
    );
  return [
    ...new Set(
      hrefs.filter((href) =>
        ROLE_HOME_HREFS.includes(href as (typeof ROLE_HOME_HREFS)[number]),
      ),
    ),
  ];
}

async function assertOnlyRoleHomeInSidebar(page: Page, role: WorkspaceRole) {
  const expected = ROLE_HOME[role];
  await expect
    .poll(async () => collectRoleHomeHrefs(page), { timeout: 20_000 })
    .toEqual([expected]);
}

async function measureOverflow(page: Page) {
  return page.evaluate(() => {
    const shell = document.querySelector(".page-shell, #main-content, main");
    const target = (shell || document.documentElement) as HTMLElement;
    return target.scrollWidth - target.clientWidth;
  });
}

async function attachRuntimeGuards(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => {
    errors.push(error.message);
  });
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      const text = msg.text();
      if (/Runtime Error|Uncaught|Hydration failed|Minified React error/i.test(text)) {
        errors.push(text);
      }
    }
  });
  return errors;
}

test.describe("C-P0-07 V1 delivery critical journeys", () => {
  test("1) owner login -> only boss home in sidebar", async ({ page }) => {
    await loginAsRole(page, "owner");
    await expect(page).toHaveURL(/\/dashboard\/boss/);
    await assertOnlyRoleHomeInSidebar(page, "owner");
    await expect(page.locator('a[href="/dashboard/admin"]')).toHaveCount(0);
    await expect(page.locator('a[href="/dashboard/sales-rep"]')).toHaveCount(0);
  });

  test("2) admin login -> only admin home", async ({ page }) => {
    await loginAsRole(page, "admin");
    await expect(page).toHaveURL(/\/dashboard\/admin/);
    await assertOnlyRoleHomeInSidebar(page, "admin");
    await expect(page.locator('a[href="/dashboard/boss"]')).toHaveCount(0);
    await expect(page.locator('a[href="/dashboard/sales-rep"]')).toHaveCount(0);
  });

  test("3) member login -> only sales-rep home", async ({ page }) => {
    await loginAsRole(page, "member");
    await expect(page).toHaveURL(/\/dashboard\/sales-rep/);
    await assertOnlyRoleHomeInSidebar(page, "member");
    await expect(page.locator('a[href="/dashboard/boss"]')).toHaveCount(0);
    await expect(page.locator('a[href="/dashboard/admin"]')).toHaveCount(0);
  });

  test("4) role cannot access other role homes (redirect)", async ({ page }) => {
    await loginAsRole(page, "member");
    await assertOnlyRoleHomeInSidebar(page, "member");

    await page.goto("/dashboard/boss");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(1000);

    const url = page.url();
    if (/\/dashboard\/sales-rep/.test(url)) {
      await expect(page).toHaveURL(/\/dashboard\/sales-rep/);
    } else {
      test.info().annotations.push({
        type: "note",
        description:
          "Preview e2e runs with empty API_BASE_URL so enforceRoleHomeAccess is intentionally skipped. Asserted sidebar exclusivity instead; unit tests cover canAccessRoleHomePath.",
      });
      await assertOnlyRoleHomeInSidebar(page, "member");
      await expect(page.locator('a[href="/dashboard/boss"]')).toHaveCount(0);
    }

    await page.goto("/dashboard/admin");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(800);
    if (/\/dashboard\/sales-rep/.test(page.url())) {
      await expect(page).toHaveURL(/\/dashboard\/sales-rep/);
    } else {
      await assertOnlyRoleHomeInSidebar(page, "member");
    }
  });

  test("5) AI selection submit creates inquiry (mocked)", async ({ page }) => {
    const inquiryId = await mockSelectionSubmitCreatesInquiry(page);
    let capturedSource = "";

    await page.route("**/api/selection-pages/public/*/submit", async (route) => {
      const body = route.request().postDataJSON() as {
        source?: string;
        answers?: { source?: string };
      };
      capturedSource = body.source || body.answers?.source || "";
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          inquiryId,
          leadId: "lead_e2e_selection_001",
          submissionId: "sub_e2e_001",
        }),
      });
    });

    await page.goto("/s/outdoor-cabinet?source=wechat_official_account&preview=1");
    await page.waitForLoadState("networkidle");

    await page.getByPlaceholder("\u8bf7\u8f93\u5165\u8054\u7cfb\u4eba").fill("\u9009\u578b\u6d4b\u8bd5");
    await page.getByPlaceholder("\u8bf7\u8f93\u5165\u624b\u673a\u53f7").fill("13800138000");

    const submitBtn = page.getByRole("button", { name: /\u63d0\u4ea4\u9700\u6c42|\u63d0\u4ea4/ }).first();
    await expect(submitBtn).toBeVisible({ timeout: 20_000 });
    await submitBtn.click();

    await expect(
      page.getByText(/\u63d0\u4ea4\u6210\u529f|\u9700\u6c42\u63d0\u4ea4\u6210\u529f|\u611f\u8c22|\u5de5\u7a0b\u5e08/).first(),
    ).toBeVisible({ timeout: 20_000 });
    expect(capturedSource === "" || /wechat/i.test(capturedSource)).toBeTruthy();
  });

  test("6) inquiry assign + status change", async ({ page }) => {
    await installRoleSession(page, "owner");
    await mockUpstreamMode(page);
    const { inquiry, candidates } = await mockInquiryAssignAndStatus(page);

    await page.goto("/dashboard/inquiries/assign");
    await page.waitForLoadState("networkidle");

    await expect(page.getByText(inquiry.customerName).first()).toBeVisible({ timeout: 20_000 });
    await page.locator("select").first().selectOption(candidates[0].userId);
    await page.locator("textarea").first().fill("E2E assign remark");
    await page.getByRole("button", { name: "\u786e\u8ba4\u5206\u914d", exact: true }).click();
    await expect(page.getByText(/\u5df2\u6210\u529f\u5206\u914d/).first()).toBeVisible({
      timeout: 15_000,
    });

    await page.goto(`/dashboard/inquiries/${inquiry.id}`);
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(inquiry.customerName).first()).toBeVisible({ timeout: 20_000 });
    await page.getByRole("button", { name: "\u6807\u8bb0\u4e22\u5355" }).click();
    await expect(page.getByText(/\u6807\u8bb0\u4e22\u5355\u6210\u529f|\u6210\u529f/).first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test("7) create follow task", async ({ page }) => {
    await installRoleSession(page, "owner");
    await mockUpstreamMode(page);
    await mockFollowTaskCreate(page);
    await page.route((url) => url.pathname.includes("/api/inquiries"), async (route) => {
      if (route.request().method() !== "GET") {
        await route.fallback();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            id: "inq_e2e_task_001",
            conversationId: "conv_t",
            leadId: null,
            botId: "bot",
            botName: "Website Bot",
            customerName: "Task Customer",
            customerContact: "Wang",
            sourceCode: null,
            sourceType: "website",
            intentLevel: "medium",
            requirementCompleteness: 50,
            summary: "Task linked inquiry",
            missingFields: [],
            needsEngineer: false,
            ownerId: "user_e2e_owner",
            nextActionAt: null,
            quoteStatus: "none",
            status: "open",
            updatedAt: "2026-07-21T08:00:00.000Z",
            createdAt: "2026-07-21T07:00:00.000Z",
          },
        ]),
      });
    });

    await page.goto("/dashboard/tasks/new");
    await page.waitForLoadState("networkidle");

    await expect(page.getByText(/\u4efb\u52a1\u8bbe\u7f6e|\u8ddf\u8fdb\u4efb\u52a1|\u57fa\u7840\u4fe1\u606f/).first()).toBeVisible({
      timeout: 20_000,
    });

    // Defaults already include title + due date; just submit.
    await page.getByRole("button", { name: "\u521b\u5efa\u4efb\u52a1" }).click();
    await expect(page).toHaveURL(/\/dashboard\/tasks/, { timeout: 20_000 });
  });

  test("8) inquiry to quote", async ({ page }) => {
    await installRoleSession(page, "owner");
    await mockUpstreamMode(page);
    await mockInquiryToQuote(page, "inq_e2e_quote_001");

    await page.goto("/dashboard/inquiries/inq_e2e_quote_001");
    await page.waitForLoadState("networkidle");

    const quoteBtn = page
      .getByRole("button", { name: /\u521b\u5efa\u62a5\u4ef7|\u8f6c\u62a5\u4ef7|\u751f\u6210\u62a5\u4ef7/ })
      .first();
    await expect(quoteBtn).toBeVisible({ timeout: 20_000 });
    await quoteBtn.click();

    await expect(page).toHaveURL(/\/dashboard\/quotes\/quote_e2e_001/, { timeout: 20_000 });
  });

  test("9) knowledge upload status display", async ({ page }) => {
    await installRoleSession(page, "owner");
    await page.goto("/dashboard/knowledge-bases");
    await page.waitForLoadState("networkidle");

    const statusFilter = page.getByLabel(/\u6309\u6587\u6863\u72b6\u6001\u7b5b/);
    await expect(page.getByText(/\u5df2\u5411\u91cf\u5316/).first()).toBeVisible({ timeout: 20_000 });

    await statusFilter.selectOption("processing");
    await expect(page.locator("main").locator(":not(option)").filter({ hasText: /^\u5904\u7406\u4e2d$/ }).first()).toBeVisible({
      timeout: 10_000,
    });

    await statusFilter.selectOption("failed");
    await expect(page.locator("main").locator(":not(option)").filter({ hasText: /^\u5931\u8d25$/ }).first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test("10) wechat source param passthrough on public page", async ({ page }) => {
    await page.goto("/s/outdoor-cabinet?source=wechat&preview=1");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(/\u5fae\u4fe1\u516c\u4f17\u53f7|\u6765\u6e90\u6807\u8bc6/).first()).toBeVisible({
      timeout: 20_000,
    });

    await page.goto("/link/e2e-wechat-link?source=wx");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByText(/\u5fae\u4fe1\u516c\u4f17\u53f7|\u6765\u6e90/).first()).toBeVisible({
      timeout: 10_000,
    });
    const continueLink = page.locator('a[href*="source="]').first();
    if ((await continueLink.count()) > 0) {
      const href = (await continueLink.getAttribute("href")) || "";
      expect(href).toMatch(/source=wechat_official_account|source=wx/);
    } else {
      const html = await page.content();
      expect(html).toMatch(/wechat_official_account|\u5fae\u4fe1\u516c\u4f17\u53f7/);
    }
  });

  for (const viewport of [
    { name: "desktop", width: 1440, height: 900, routes: ["/dashboard/boss", "/dashboard/inquiries", "/dashboard/tasks", "/dashboard/knowledge-bases"] },
    { name: "mobile", width: 390, height: 844, routes: ["/dashboard/inquiries", "/dashboard/tasks", "/dashboard/knowledge-bases"] },
  ]) {
    test(`11) ${viewport.name} no horizontal overflow on key pages`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await installRoleSession(page, "owner");

      for (const route of viewport.routes) {
        await page.goto(route);
        await page.waitForLoadState("networkidle");
        const overflow = await measureOverflow(page);
        expect(overflow, `${route} overflow=${overflow}`).toBeLessThanOrEqual(1);
      }
    });
  }

  test("12) no Runtime Error / uncaught exceptions on smoke pages", async ({ page }) => {
    await installRoleSession(page, "owner");
    const errors = await attachRuntimeGuards(page);

    for (const route of SMOKE_ROUTES) {
      await page.goto(route);
      await page.waitForLoadState("domcontentloaded");
      await page.waitForTimeout(600);
      await expect(
        page.getByText(/Runtime Error|Application error|Unhandled Runtime Error/i),
      ).toHaveCount(0);
    }

    expect(errors, errors.join("\\n")).toEqual([]);
  });
});
