import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import { resolveSelectionPagePublicUrl } from "./ai-standalone-shared";

const originalEntryUrl = process.env.NEXT_PUBLIC_ENTRY_URL;

afterEach(() => {
  if (originalEntryUrl === undefined) delete process.env.NEXT_PUBLIC_ENTRY_URL;
  else process.env.NEXT_PUBLIC_ENTRY_URL = originalEntryUrl;
});

describe("selection page public URL", () => {
  it("uses an explicit local preview origin when provided", () => {
    assert.equal(
      resolveSelectionPagePublicUrl("demo-page", "http://localhost:3000/"),
      "http://localhost:3000/s/demo-page",
    );
  });

  it("uses the dedicated customer-entry domain outside the browser", () => {
    process.env.NEXT_PUBLIC_ENTRY_URL = "https://go.qiyuntu.cn/";
    assert.equal(
      resolveSelectionPagePublicUrl("published-page"),
      "https://go.qiyuntu.cn/s/published-page",
    );
  });
});
