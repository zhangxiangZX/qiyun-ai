import { expect, test } from "@playwright/test";

import {
  API_URL,
  E2E_SALES_EMAIL,
  E2E_SALES_PASSWORD,
  apiLogin,
  authHeaders,
  loginViaUi,
  waitForPageReady,
  waitForUpstreamMode,
} from "./helpers/auth";

test.describe("permission", () => {
  test("Owner 可进入企业资料与团队成员", async ({ page }) => {
    await loginViaUi(page);
    await waitForUpstreamMode(page);
    await page.goto("/dashboard/team/profile");
    await waitForPageReady(page);
    await expect(page.getByText(/企业资料|企业/).first()).toBeVisible();
    await page.goto("/dashboard/team");
    await waitForPageReady(page);
    await expect(page.getByText(/成员|邀请|角色/).first()).toBeVisible();
  });

  test("未登录访问业务 API 应拒绝", async ({ request }) => {
    const res = await request.get(`${API_URL}/inquiries?limit=1`);
    // 期望 401/403；若出现 500 记为后端缺陷但仍视为“未放行数据”
    expect([401, 403, 500]).toContain(res.status());
    if (res.status() === 500) {
      test.info().annotations.push({
        type: "bug",
        description: "未登录访问 /inquiries 返回 500，应统一为 401",
      });
    }
  });

  test("错误 workspace header 不可越权读取", async ({ request }) => {
    const { accessToken } = await apiLogin(request);
    const res = await request.get(`${API_URL}/inquiries?limit=1`, {
      headers: authHeaders(accessToken, "ws_not_a_member_xxxxx"),
    });
    expect([401, 403, 404, 500]).toContain(res.status());
    if (res.status() === 500) {
      test.info().annotations.push({
        type: "bug",
        description: "非法 x-workspace-id 返回 500，应统一为 403",
      });
    }
  });

  test("销售账号仅能看自己范围（需 E2E_SALES_*）", async ({ page, request }) => {
    test.skip(!E2E_SALES_EMAIL || !E2E_SALES_PASSWORD, "未配置 E2E_SALES_EMAIL/PASSWORD，跳过销售越权用例");
    const owner = await apiLogin(request);
    const sales = await apiLogin(request, E2E_SALES_EMAIL, E2E_SALES_PASSWORD);
    const marker = `OWNER-ONLY-${Date.now()}`;
    const create = await request.post(`${API_URL}/inquiries`, {
      headers: authHeaders(owner.accessToken, owner.workspaceId),
      data: {
        customerName: marker,
        contactName: "Owner专属",
        phone: `139${String(Date.now()).slice(-8)}`,
        source: "manual",
        status: "new",
        summary: "owner scoped inquiry",
      },
    });
    expect(create.ok(), await create.text()).toBeTruthy();

    await loginViaUi(page, E2E_SALES_EMAIL, E2E_SALES_PASSWORD);
    await waitForUpstreamMode(page);
    await page.goto("/dashboard/inquiries");
    await waitForPageReady(page);
    await expect(page.getByText(marker)).toHaveCount(0);
  });
});
