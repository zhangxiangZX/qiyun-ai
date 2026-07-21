import { expect, test } from "@playwright/test";

import { loginViaUi, waitForPageReady, waitForUpstreamMode } from "./helpers/auth";

test.describe("ai", () => {
  test.beforeEach(async ({ page }) => {
    await loginViaUi(page);
    await waitForUpstreamMode(page);
  });

  test("AI 助手列表与新建入口", async ({ page }) => {
    await page.goto("/dashboard/bots");
    await waitForPageReady(page);
    await expect(page.getByText(/AI\s*助手/).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "新建助手" }).first()).toBeVisible();
  });

  test("知识库页面可打开并展示上传/列表区", async ({ page }) => {
    await page.goto("/dashboard/knowledge-bases");
    await waitForPageReady(page);
    await expect(page.getByText(/知识库/).first()).toBeVisible();
    await expect(page.getByText(/上传|文档|新建|空/).first()).toBeVisible({ timeout: 20_000 });
  });

  test("AI 测试页可交互入口可见", async ({ page }) => {
    await page.goto("/dashboard/conversations/test");
    await waitForPageReady(page);
    await expect(page.getByText(/测试|对话|发送|助手/).first()).toBeVisible({ timeout: 25_000 });
  });

  test("AI 选型独立页列表可打开", async ({ page }) => {
    await page.goto("/dashboard/bots/landing");
    await waitForPageReady(page);
    await expect(page.getByText(/选型|独立页|落地页/).first()).toBeVisible();
  });
});
