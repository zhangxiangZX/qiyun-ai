import { expect, test } from "@playwright/test";

import { loginViaUi, waitForPageReady, waitForUpstreamMode } from "./helpers/auth";

test.describe("widget", () => {
  test.beforeEach(async ({ page }) => {
    await loginViaUi(page);
    await waitForUpstreamMode(page);
  });

  test("官网 Widget 配置页加载", async ({ page }) => {
    await page.goto("/dashboard/sites");
    await waitForPageReady(page);
    await expect(page.getByText(/Widget|站点|安装|嵌入/).first()).toBeVisible({ timeout: 25_000 });
  });

  test("销售链接页加载", async ({ page }) => {
    await page.goto("/dashboard/channels/links");
    await waitForPageReady(page);
    await expect(page.getByText(/销售链接|二维码|创建/).first()).toBeVisible();
  });

  test("二维码管理页加载", async ({ page }) => {
    await page.goto("/dashboard/channels/qrcodes");
    await waitForPageReady(page);
    await expect(page.getByText(/二维码/).first()).toBeVisible();
  });
});
