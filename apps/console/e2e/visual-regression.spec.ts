import { expect, test } from "./fixtures";

async function stabilise(page: import("@playwright/test").Page) {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        caret-color: transparent !important;
      }
    `,
  });
  await page.waitForLoadState("networkidle");
}

for (const viewport of [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
]) {
  test.describe(`${viewport.name} visual regression`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    for (const target of [
      { name: "dashboard", route: "/dashboard" },
      { name: "inquiries", route: "/dashboard/inquiries" },
      { name: "knowledge", route: "/dashboard/knowledge-bases" },
    ]) {
      test(`${target.name} matches baseline`, async ({ authedPage: page }) => {
        await page.goto(target.route);
        await stabilise(page);
        await expect(page).toHaveScreenshot(`${target.name}-${viewport.name}.png`, {
          fullPage: true,
        });
      });
    }
  });
}
