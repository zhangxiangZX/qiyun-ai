import type { Page } from "@playwright/test";

function json(body: unknown, status = 200) {
  return {
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  };
}

export const upstreamMode = {
  mode: "upstream",
  upstreamConfigured: true,
  message: "Connected to upstream API (apps/api) via BFF proxy.",
};

export const previewMode = {
  mode: "preview",
  upstreamConfigured: false,
  message: "Preview mode: Console in-memory BFF only. Set API_BASE_URL to connect apps/api.",
};

export async function mockConsoleMode(page: Page, mode: typeof upstreamMode | typeof previewMode) {
  await page.route("**/api/console/mode", async (route) => {
    await route.fulfill(json(mode));
  });
}

export async function mockDashboardFailure(page: Page, status: number, message: string) {
  await mockConsoleMode(page, upstreamMode);
  await page.route("**/api/dashboard", async (route) => {
    await route.fulfill(json({ code: "INTERNAL_ERROR", message }, status));
  });
}

export async function mockBotDetailNotFound(page: Page, botId: string) {
  await mockConsoleMode(page, upstreamMode);
  await page.route(`**/api/bots/${botId}`, async (route) => {
    await route.fulfill(json({ code: "NOT_FOUND", message: "Bot not found." }, 404));
  });
  await page.route("**/api/bots", async (route) => {
    await route.fulfill(json([]));
  });
}

export async function mockBotDetailLoadError(page: Page, botId: string) {
  await mockConsoleMode(page, upstreamMode);
  await page.route(`**/api/bots/${botId}`, async (route) => {
    await route.fulfill(json({ code: "INTERNAL_ERROR", message: "Upstream exploded." }, 500));
  });
}

export async function mockBotsListFailure(page: Page) {
  await mockConsoleMode(page, upstreamMode);
  await page.route("**/api/bots", async (route) => {
    await route.fulfill(json({ code: "UNAUTHORIZED", message: "No active session." }, 401));
  });
}

export async function mockDashboardPanelFailures(page: Page) {
  await mockConsoleMode(page, upstreamMode);
  await page.route("**/api/dashboard", async (route) => {
    await route.fulfill(
      json({
        hasBots: true,
        kpis: [
          {
            id: "sessions",
            label: "总会话数",
            value: "128",
            description: "test",
            trend: "+10%",
            trendDirection: "up",
          },
        ],
        trend7: [{ date: "2026-07-01", label: "7/1", sessions: 12, leads: 2 }],
        trend30: [{ date: "2026-07-01", label: "7/1", sessions: 12, leads: 2 }],
        recentLeads: [{ id: "lead_1", company: "Acme", need: "demo", level: "高意向", time: "1h" }],
        frequentQuestions: [],
        unresolvedQuestions: [],
      }),
    );
  });
  await page.route("**/api/bots", async (route) => {
    await route.fulfill(json({ code: "INTERNAL_ERROR", message: "Bots panel down." }, 500));
  });
  await page.route("**/api/conversations**", async (route) => {
    await route.fulfill(json({ code: "INTERNAL_ERROR", message: "Conversations panel down." }, 500));
  });
}
