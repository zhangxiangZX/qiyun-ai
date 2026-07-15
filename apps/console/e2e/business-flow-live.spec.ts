import { expect, test } from "@playwright/test";

import { loginViaUi, waitForPageReady, waitForUpstreamMode } from "./helpers/live-auth";

test.describe.configure({ mode: "serial" });

test.describe("业务流程 - 真实 upstream", () => {
  test.beforeEach(async ({ page }) => {
    await loginViaUi(page);
  });

  test("BF-01 登录后进入角色工作台，upstream 模式正常", async ({ page }) => {
    await waitForPageReady(page);
    const mode = await waitForUpstreamMode(page);
    expect(mode).toBe("upstream");

    await expect(page.getByText(/工作台|首页概览|有效询盘|创建机器人/).first()).toBeVisible({
      timeout: 20_000,
    });
  });

  test("BF-02 助手列表与新建入口可用", async ({ page }) => {
    await page.goto("/dashboard/bots");
    await waitForPageReady(page);
    await waitForUpstreamMode(page);

    await expect(page.getByText(/新建 ?AI助手|新建助手/).first()).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText(/AI助手|助手列表/).first()).toBeVisible({ timeout: 20_000 });
  });

  test("BF-03 报表加载并进入真实报表页", async ({ page }) => {
    await page.goto("/dashboard/reports/channel");
    await waitForPageReady(page);
    await waitForUpstreamMode(page);

    await expect(page.getByText(/渠道总询盘|渠道转化洞察|渠道来源排名|渠道分析/).first()).toBeVisible({
      timeout: 45_000,
    });
    await expect(page.getByText(/刷新|导出/).first()).toBeVisible();
  });

  test("BF-04 站点页与测试消息入口可见", async ({ page }) => {
    await page.goto("/dashboard/sites");
    await waitForPageReady(page);
    await waitForUpstreamMode(page);

    await expect(page.getByText(/官网 Widget|Widget 配置|安装代码|实时预览/).first()).toBeVisible({
      timeout: 20_000,
    });
  });
});
