import { test, expect, type Page } from "@playwright/test";

import {
  assertAgreementBeforeSubmit,
  mockAuthLoginFailure,
  mockAuthLoginSuccess,
  mockPasswordResetConfirm,
  mockPasswordResetRequest,
  mockTrialRequestSuccess,
} from "./helpers/auth-mock.mjs";

async function gotoHydrated(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
}

test.describe("鉴权", () => {
  test("未登录访问 Dashboard 会跳转到登录页", async ({ page }) => {
    await gotoHydrated(page, "/dashboard");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole("button", { name: "登录", exact: true })).toBeVisible();
  });
});

test.describe("登录", () => {
  test("协议勾选位于登录按钮之前", async ({ page }) => {
    await gotoHydrated(page, "/login");
    await expect(page.getByRole("heading", { name: "欢迎登录" })).toBeVisible();
    await assertAgreementBeforeSubmit(page);
  });

  test("未勾选协议时展示校验错误", async ({ page }) => {
    await gotoHydrated(page, "/login");
    await page.getByPlaceholder("请输入工作邮箱").fill("demo@example.com");
    await page.getByPlaceholder("请输入登录密码").fill("secret123");
    await page.getByRole("button", { name: "登录", exact: true }).click();
    await expect(page.getByText("请先同意用户协议与隐私政策。")).toBeVisible();
  });

  test("失败时展示上游错误信息", async ({ page }) => {
    await mockAuthLoginFailure(page, "邮箱或密码错误。");
    await gotoHydrated(page, "/login");
    const emailInput = page.getByPlaceholder("请输入工作邮箱");
    await emailInput.fill("demo@example.com");
    await expect(emailInput).toHaveValue("demo@example.com");
    await page.getByPlaceholder("请输入登录密码").fill("wrong-password");
    await page.locator('label:has-text("用户协议") input[type="checkbox"]').check();
    await page.getByRole("button", { name: "登录", exact: true }).click();
    await expect(page.getByText("邮箱或密码错误。")).toBeVisible();
  });

  test("成功时展示成功提示", async ({ page }) => {
    await mockAuthLoginSuccess(page);
    await gotoHydrated(page, "/login");
    const emailInput = page.getByPlaceholder("请输入工作邮箱");
    await emailInput.fill("demo@example.com");
    await expect(emailInput).toHaveValue("demo@example.com");
    await page.getByPlaceholder("请输入登录密码").fill("secret123");
    await page.locator('label:has-text("用户协议") input[type="checkbox"]').check();
    await page.getByRole("button", { name: "登录", exact: true }).click();
    await expect(page.getByText("登录成功，正在进入控制台。")).toBeVisible();
    await expect(page).toHaveURL(/\/dashboard\//, { timeout: 15_000 });
  });

  test("忘记密码跳转到重置页", async ({ page }) => {
    await gotoHydrated(page, "/login");
    await page.getByLabel("登录区域").getByRole("link", { name: "忘记密码？重置密码" }).click();
    await expect(page).toHaveURL(/\/forgot-password/);
    await expect(page.getByRole("heading", { name: "找回密码" })).toBeVisible();
  });

  test("可进入申请试用与验证码登录", async ({ page }) => {
    await gotoHydrated(page, "/login");
    await page.getByLabel("登录区域").getByRole("link", { name: "申请试用" }).click();
    await expect(page).toHaveURL(/\/trial/);
    await gotoHydrated(page, "/login");
    await page.getByRole("link", { name: "验证码登录" }).click();
    await expect(page).toHaveURL(/\/login\/code/);
  });
});

test.describe("申请试用", () => {
  test("校验必填项", async ({ page }) => {
    await gotoHydrated(page, "/trial");
    await page.getByRole("button", { name: "提交试用申请" }).click();
    await expect(page.getByText("请完善必填项后再提交。")).toBeVisible();
    await expect(page.getByText("请填写企业名称。")).toBeVisible();
  });

  test("提交成功展示审核指引", async ({ page }) => {
    await mockTrialRequestSuccess(page);
    await gotoHydrated(page, "/trial");
    await page.getByPlaceholder("请输入企业名称").fill("华东制造");
    await page.getByPlaceholder("联系人姓名").fill("张工");
    await page.getByPlaceholder("工作邮箱（用于接收邀请）").fill("trial@example.com");
    await page.getByRole("button", { name: "提交试用申请" }).click();
    await expect(page.getByRole("heading", { name: "试用申请已收到" })).toBeVisible();
  });
});

test.describe("注册路由", () => {
  test("/register 展示审核开通说明", async ({ page }) => {
    await gotoHydrated(page, "/register");
    await expect(page.getByRole("heading", { name: "注册与开通" })).toBeVisible();
    await expect(page.getByRole("link", { name: /提交试用申请/ }).first()).toHaveAttribute("href", "/trial");
  });
});

test.describe("重置密码", () => {
  test("发送验证码并确认成功后返回登录页", async ({ page }) => {
    await mockPasswordResetRequest(page, "654321");
    await mockPasswordResetConfirm(page);
    await gotoHydrated(page, "/forgot-password");
    await page.getByPlaceholder("请输入工作邮箱").fill("demo@example.com");
    await page.getByRole("button", { name: "发送验证码" }).click();
    await expect(page.getByText("当前环境未接入真实邮件，请使用下方验证码。")).toBeVisible();
    await expect(page.getByText("654321")).toBeVisible();
    const codeInputs = page.getByRole("group", { name: "6 位验证码输入" }).getByRole("textbox");
    for (const [index, digit] of [..."654321"].entries()) {
      await codeInputs.nth(index).fill(digit);
    }
    await page.getByPlaceholder("请输入新密码（至少 6 位）").fill("newsecret123");
    await page.getByPlaceholder("请再次输入新密码").fill("newsecret123");
    await page.getByRole("button", { name: "重置密码", exact: true }).click();
    await expect(page.getByRole("heading", { name: "密码重置成功" })).toBeVisible();
    await page.getByRole("button", { name: "返回登录" }).click();
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
  });
});
