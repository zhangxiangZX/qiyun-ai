import { expect, test } from "./fixtures";

const routes = [
  "/dashboard",
  "/dashboard/inquiries",
  "/dashboard/knowledge-bases",
  "/dashboard/bots",
  "/dashboard/quotes",
  "/dashboard/team",
  "/dashboard/reports",
  "/dashboard/sites",
];

for (const viewport of [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
]) {
  test.describe(`${viewport.name} layout contract`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    for (const route of routes) {
      test(`${route} keeps the shared page grid`, async ({ authedPage: page }) => {
        await page.goto(route);
        await page.waitForLoadState("networkidle");

        const metrics = await page.evaluate(() => {
          const shell = document.querySelector<HTMLElement>(".page-shell");
          const content = document.querySelector<HTMLElement>("#main-content > .content");
          const title = document.querySelector<HTMLElement>("main h1");
          const viewportWidth = document.documentElement.clientWidth;
          const rect = shell?.getBoundingClientRect();
          const contentRect = content?.getBoundingClientRect();
          const contentStyle = content ? getComputedStyle(content) : null;
          return {
            hasShell: Boolean(shell),
            hasContent: Boolean(content),
            overflow: document.documentElement.scrollWidth - viewportWidth,
            width: rect?.width ?? 0,
            contentWidth: contentRect?.width ?? 0,
            paddingLeft: contentStyle ? Number.parseFloat(contentStyle.paddingLeft) : 0,
            paddingRight: contentStyle ? Number.parseFloat(contentStyle.paddingRight) : 0,
            titleSize: title ? Number.parseFloat(getComputedStyle(title).fontSize) : null,
          };
        });

        expect(metrics.hasShell).toBeTruthy();
        expect(metrics.hasContent).toBeTruthy();
        expect(metrics.overflow).toBeLessThanOrEqual(1);
        expect(metrics.paddingLeft).toBeGreaterThanOrEqual(16);
        expect(metrics.paddingRight).toBeGreaterThanOrEqual(16);
        expect(metrics.width).toBeLessThanOrEqual(metrics.contentWidth);
        if (metrics.titleSize !== null) expect(metrics.titleSize).toBeGreaterThanOrEqual(20);
      });
    }
  });
}
