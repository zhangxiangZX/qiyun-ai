import { expect, test } from "@playwright/test";

import {
  apiLogin,
  authHeaders,
  loginViaUi,
  waitForPageReady,
  waitForUpstreamMode,
} from "./helpers/auth";

test.describe("inquiry", () => {
  test.beforeEach(async ({ page }) => {
    await loginViaUi(page);
    await waitForUpstreamMode(page);
  });

  test("询盘中心加载列表与关键操作", async ({ page }) => {
    await page.goto("/dashboard/inquiries");
    await waitForPageReady(page);
    await expect(page.getByText(/询盘/).first()).toBeVisible();
    await expect(page.locator("body")).toContainText(/新建|快速|导出|筛选|搜索|全部|状态/);
  });

  test("快速录入页表单与保存入口可见", async ({ page }) => {
    await page.goto("/dashboard/quick-entry");
    await waitForPageReady(page);
    await expect(page.getByText(/智能快速录入|快速录入/).first()).toBeVisible();
    await expect(page.getByText(/客户|手机|来源/).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /保存/ }).first()).toBeVisible();
  });

  test("API 创建询盘后列表可检索到", async ({ page, request }) => {
    const { accessToken, workspaceId } = await apiLogin(request);
    const marker = `E2E机柜-${Date.now()}`;
    const create = await request.post(`${process.env.PLAYWRIGHT_API_URL ?? "http://localhost:3001"}/inquiries`, {
      headers: authHeaders(accessToken, workspaceId),
      data: {
        customerName: marker,
        contactName: "测试联系人",
        phone: `138${String(Date.now()).slice(-8)}`,
        source: "manual",
        status: "new",
        summary: "户外机柜 20 台 800*600*2000 室外",
      },
    });
    expect(create.ok(), await create.text()).toBeTruthy();

    await page.goto("/dashboard/inquiries");
    await waitForPageReady(page);
    // 使用列表内搜索，避开顶栏 disabled 的全局搜索
    const search = page.locator("#inquiry-list-search");
    await search.waitFor({ state: "visible", timeout: 15_000 });
    await search.fill(marker);
    await expect(page.getByText(marker).first()).toBeVisible({ timeout: 30_000 });
  });

  test("打开询盘详情并可见状态区", async ({ page, request }) => {
    const { accessToken, workspaceId } = await apiLogin(request);
    const list = await request.get(
      `${process.env.PLAYWRIGHT_API_URL ?? "http://localhost:3001"}/inquiries?limit=1`,
      { headers: authHeaders(accessToken, workspaceId) },
    );
    expect(list.ok()).toBeTruthy();
    const body = await list.json();
    const items = body.data?.items ?? body.items ?? body.data ?? [];
    const first = Array.isArray(items) ? items[0] : null;
    test.skip(!first?.id, "无可用询盘数据");
    await page.goto(`/dashboard/inquiries/${first.id}`);
    await waitForPageReady(page);
    await expect(page.getByText(/询盘|客户|跟进|状态/).first()).toBeVisible({ timeout: 25_000 });
  });
});
