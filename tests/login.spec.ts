import { expect, test } from "@playwright/test";

import { E2E_EMAIL, E2E_PASSWORD, loginViaUi, waitForUpstreamMode } from "./helpers/auth";

test.describe("login", () => {
  test("页面加载与关键入口", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "欢迎登录" })).toBeVisible();
    await expect(page.getByRole("button", { name: "登录", exact: true })).toBeVisible();
    await expect(page.getByText(/申请试用/).first()).toBeVisible();
    await expect(page.getByText(/验证码登录/).first()).toBeVisible();
  });

  test("错误密码展示失败提示", async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder("请输入工作邮箱").fill(E2E_EMAIL);
    await page.getByPlaceholder("请输入登录密码").fill("DefinitelyWrongPass!999");
    await page.locator('label:has-text("用户协议") input[type="checkbox"]').check();
    await page.getByRole("button", { name: "登录", exact: true }).click();
    await expect(page.getByText(/邮箱或密码错误|登录失败|密码错误|不正确/).first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(page).toHaveURL(/\/login/);
  });

  test("空账号点击登录有校验", async ({ page }) => {
    await page.goto("/login");
    await page.locator('label:has-text("用户协议") input[type="checkbox"]').check();
    await page.getByRole("button", { name: "登录", exact: true }).click();
    await expect(page.getByText(/请输入|邮箱|密码|必填/).first()).toBeVisible({ timeout: 10_000 });
  });

  test("未勾选协议阻止登录", async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder("请输入工作邮箱").fill(E2E_EMAIL);
    await page.getByPlaceholder("请输入登录密码").fill(E2E_PASSWORD);
    await page.getByRole("button", { name: "登录", exact: true }).click();
    await expect(page.getByText(/用户协议|隐私政策/).first()).toBeVisible();
  });

  test("正确账号登录进入控制台且 upstream", async ({ page }) => {
    await loginViaUi(page);
    await waitForUpstreamMode(page);
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText(/正式 API|真实 API|upstream|Connected to upstream/i).first()).toBeVisible({
      timeout: 20_000,
    });
  });
});
