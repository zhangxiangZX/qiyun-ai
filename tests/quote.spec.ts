import { expect, test } from "@playwright/test";

import { loginViaUi, waitForPageReady, waitForUpstreamMode } from "./helpers/auth";

test.describe("quote", () => {
  test.beforeEach(async ({ page }) => {
    await loginViaUi(page);
    await waitForUpstreamMode(page);
  });

  test("报价列表加载", async ({ page }) => {
    await page.goto("/dashboard/quotes");
    await waitForPageReady(page);
    await expect(page.getByText(/报价/).first()).toBeVisible();
    await expect(page.getByText(/新建|模板|预览|客户/).first()).toBeVisible({ timeout: 20_000 });
  });

  test("报价模板列表加载", async ({ page }) => {
    await page.goto("/dashboard/quotes/templates");
    await waitForPageReady(page);
    await expect(page.getByText(/模板|报价/).first()).toBeVisible();
  });

  test("从列表进入新建或详情入口", async ({ page }) => {
    await page.goto("/dashboard/quotes");
    await waitForPageReady(page);
    const create = page.getByRole("link", { name: /新建报价|新建/ }).first();
    const detail = page.getByRole("link", { name: /查看|详情/ }).first();
    if (await create.count()) {
      await create.click();
      await expect(page).toHaveURL(/\/dashboard\/quotes/);
      await expect(page.getByText(/报价|客户|产品|金额|模板/).first()).toBeVisible({
        timeout: 20_000,
      });
      return;
    }
    if (await detail.count()) {
      await detail.click();
      await expect(page.getByText(/报价|客户|预览|发送/).first()).toBeVisible({ timeout: 20_000 });
      return;
    }
    test.info().annotations.push({ type: "note", description: "无可点新建/详情，仅验证列表壳" });
  });
});
