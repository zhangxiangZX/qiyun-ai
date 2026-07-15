import { test as base, expect } from "@playwright/test";
import type { Page } from "@playwright/test";

import { installAuthCookies } from "./helpers/auth";

export const test = base.extend<{ authedPage: Page }>({
  authedPage: async ({ context, page, baseURL }, use) => {
    await installAuthCookies(context, baseURL);
    await use(page);
  },
});

export { expect };
