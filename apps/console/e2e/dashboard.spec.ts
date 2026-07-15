import { test, expect } from "./fixtures";
import {
  mockDashboardFailure,
  mockDashboardPanelFailures,
} from "./helpers/mock-api";

test.describe("Dashboard 概览", () => {
  test("Preview 模式成功态展示 KPI", async ({ authedPage: page }) => {
    await page.goto("/dashboard");
    await expect(page.getByText("总会话数").first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole("button", { name: "重新加载" })).toHaveCount(0);
  });

  test("主数据加载失败时展示可重试错误，不显示假 KPI", async ({ authedPage: page }) => {
    await mockDashboardFailure(page, 503, "Dashboard unavailable.");
    await page.goto("/dashboard");

    await expect(page.getByText("看板数据加载失败，请稍后重试。")).toBeVisible();
    await expect(page.getByRole("button", { name: "重新加载" })).toBeVisible();
    await expect(page.getByText("总会话数")).toHaveCount(0);
  });

  test("鉴权失败时展示权限类错误提示", async ({ authedPage: page }) => {
    await mockDashboardFailure(page, 401, "No active session.");
    await page.goto("/dashboard");

    await expect(page.getByText("没有操作权限")).toBeVisible();
    await expect(page.getByText("No active session.")).toBeVisible();
    await expect(page.getByRole("button", { name: "重新加载" })).toBeVisible();
  });

  test("成功态下子面板失败展示独立错误与重试", async ({ authedPage: page }) => {
    await mockDashboardPanelFailures(page);
    await page.goto("/dashboard");

    await expect(page.getByText("总会话数").first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText("机器人状态加载失败，请稍后重试。")).toBeVisible();
    await expect(page.getByText("最近会话加载失败，请稍后重试。")).toBeVisible();
    await expect(page.getByRole("button", { name: "重新加载" })).toHaveCount(2);
  });
});
