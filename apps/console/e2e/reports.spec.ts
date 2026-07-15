import type { Route } from "@playwright/test";

import { test, expect } from "./fixtures";
import { mockConsoleMode, upstreamMode } from "./helpers/mock-api";

test.describe("报表", () => {
  test("Preview 模式可进入报表页", async ({ authedPage: page }) => {
    await page.goto("/dashboard/reports");
    await expect(page.getByRole("heading", { name: /报表|Reports/i })).toBeVisible({
      timeout: 20_000,
    });
  });

  test("上游报表失败展示权限/网络错误与重试", async ({ authedPage: page }) => {
    await mockConsoleMode(page, upstreamMode);
    await page.route("**/api/reports", async (route: Route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ code: "INTERNAL_ERROR", message: "Reports unavailable." }),
      });
    });

    await page.goto("/dashboard/reports");
    await expect(page.getByText("网络请求失败")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText("Reports unavailable.")).toBeVisible();
    await expect(page.getByRole("button", { name: /重新加载|Reload/i })).toBeVisible();
  });
});
