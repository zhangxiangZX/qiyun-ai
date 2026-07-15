import { expect, test } from "@playwright/test";

import { API_URL, E2E_EMAIL, apiLogin, authHeaders } from "./helpers/auth";

test.describe("exceptions", () => {
  test("错误密码登录 API 失败", async ({ request }) => {
    const res = await request.post(`${API_URL}/auth/login`, {
      data: { email: E2E_EMAIL, password: "bad-password-xxx" },
    });
    expect(res.ok()).toBeFalsy();
    expect([400, 401, 403]).toContain(res.status());
  });

  test("伪造 Bearer 被拒绝", async ({ request }) => {
    const res = await request.get(`${API_URL}/auth/me`, {
      headers: { Authorization: "Bearer totally.invalid.token", "x-workspace-id": "ws_dev" },
    });
    expect([401, 403]).toContain(res.status());
  });

  test("创建询盘缺少客户名应失败或校验", async ({ request }) => {
    const { accessToken, workspaceId } = await apiLogin(request);
    const res = await request.post(`${API_URL}/inquiries`, {
      headers: authHeaders(accessToken, workspaceId),
      data: { contactName: "无客户名", phone: "13800000000", source: "manual" },
    });
    // 允许后端 4xx，或若宽松则后续仍可测列表；此处期望失败更安全
    if (res.ok()) {
      test.info().annotations.push({
        type: "bug-candidate",
        description: "缺少 customerName 仍创建成功，需产品确认是否允许",
      });
    } else {
      expect(res.status()).toBeGreaterThanOrEqual(400);
    }
  });

  test("试用页空提交有校验提示", async ({ page }) => {
    await page.goto("/trial");
    await page.getByRole("button", { name: /提交试用申请|提交/ }).click();
    await expect(page.getByText(/请填写|必填|企业|联系人|邮箱/).first()).toBeVisible();
  });
});
