import { expect, test } from "@playwright/test";

import { loginViaUi, waitForPageReady, waitForUpstreamMode } from "./helpers/auth";

const PAGES: Array<{ path: string; expectText: RegExp }> = [
  { path: "/dashboard", expectText: /工作台|首页|概览|询盘|快速/ },
  { path: "/dashboard/boss", expectText: /老板|经营|询盘|工作台/ },
  { path: "/dashboard/admin", expectText: /管理|配置|工作台|线索/ },
  { path: "/dashboard/sales-rep", expectText: /销售|任务|询盘|链接/ },
  { path: "/dashboard/quick-entry", expectText: /快速录入|智能快速录入/ },
  { path: "/dashboard/inquiries", expectText: /询盘/ },
  { path: "/dashboard/tasks", expectText: /跟进|任务|看板|列表|新建/ },
  { path: "/dashboard/bots/landing", expectText: /选型|独立页|落地|页面/ },
  { path: "/dashboard/sites", expectText: /Widget|站点|安装|嵌入|官网/ },
  { path: "/dashboard/channels/links", expectText: /销售链接|链接|二维码|渠道|创建/ },
  { path: "/dashboard/channels/qrcodes", expectText: /二维码|链接|渠道/ },
  { path: "/dashboard/bots", expectText: /AI助手|助手|机器人/ },
  { path: "/dashboard/knowledge-bases", expectText: /知识库|文档|上传/ },
  { path: "/dashboard/conversations/test", expectText: /测试|对话|发送|AI|助手/ },
  { path: "/dashboard/quotes", expectText: /报价/ },
  { path: "/dashboard/quotes/templates", expectText: /模板|报价/ },
  { path: "/dashboard/sales", expectText: /漏斗|成交|销售/ },
  { path: "/dashboard/reports/channel", expectText: /渠道|分析|报表|询盘/ },
  { path: "/dashboard/reports/follow-up", expectText: /销售|跟进|分析/ },
  { path: "/dashboard/reports/export", expectText: /导出|报表/ },
  { path: "/dashboard/team/profile", expectText: /企业资料|企业/ },
  { path: "/dashboard/team", expectText: /成员|团队/ },
  { path: "/dashboard/team/roles", expectText: /角色|权限/ },
  { path: "/dashboard/logs", expectText: /日志|操作/ },
  { path: "/dashboard/settings/account", expectText: /个人|账号|设置/ },
];

test.describe("dashboard pages", () => {
  test.beforeEach(async ({ page }) => {
    await loginViaUi(page);
    await waitForUpstreamMode(page);
  });

  for (const item of PAGES) {
    test(`打开 ${item.path}`, async ({ page }) => {
      const started = Date.now();
      await page.goto(item.path);
      await waitForPageReady(page);
      await expect(page.getByText(item.expectText).first()).toBeVisible({ timeout: 30_000 });
      const elapsed = Date.now() - started;
      expect(elapsed, `${item.path} 加载过慢: ${elapsed}ms`).toBeLessThan(15_000);
    });
  }

  test("侧栏可从询盘跳到跟进任务", async ({ page }) => {
    await page.goto("/dashboard/inquiries");
    await waitForPageReady(page);
    await page.getByRole("link", { name: /跟进任务/ }).first().click();
    await expect(page).toHaveURL(/\/dashboard\/tasks/);
  });
});
