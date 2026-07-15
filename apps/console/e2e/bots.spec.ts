import { test, expect } from "./fixtures";
import {
  mockBotDetailLoadError,
  mockBotDetailNotFound,
  mockBotsListFailure,
} from "./helpers/mock-api";

test.describe("机器人", () => {
  test("Preview 模式列表成功展示机器人", async ({ authedPage: page }) => {
    await page.goto("/dashboard/bots");
    await expect(page.getByRole("heading", { name: "机器人" })).toBeVisible();
    await expect(page.getByText("官网客服").or(page.getByText("还没有机器人"))).toBeVisible({
      timeout: 20_000,
    });
  });

  test("列表加载失败展示可重试错误", async ({ authedPage: page }) => {
    await mockBotsListFailure(page);
    await page.goto("/dashboard/bots");

    await expect(page.getByText("没有操作权限")).toBeVisible();
    await expect(page.getByRole("button", { name: "重新加载" })).toBeVisible();
  });

  test("编辑页 404 展示 not found 空态，不提供重试", async ({ authedPage: page }) => {
    const missingId = "00000000-0000-0000-0000-000000000000";
    await mockBotDetailNotFound(page, missingId);
    await page.goto(`/dashboard/bots/${missingId}/basics`);

    await expect(page.getByText("未找到该机器人，可能已被删除或链接无效。")).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByRole("button", { name: "返回列表" })).toBeVisible();
    await expect(page.getByRole("button", { name: "重新加载" })).toHaveCount(0);
  });

  test("编辑页加载失败展示可重试错误", async ({ authedPage: page }) => {
    const botId = "bot_e2e_error";
    await mockBotDetailLoadError(page, botId);
    await page.goto(`/dashboard/bots/${botId}/basics`);

    await expect(page.getByText("网络请求失败")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText("Upstream exploded.")).toBeVisible();
    await expect(page.getByRole("button", { name: "重新加载" })).toBeVisible();
    await expect(page.getByRole("button", { name: "返回列表" })).toBeVisible();
  });
});
