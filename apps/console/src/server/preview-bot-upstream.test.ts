import assert from "node:assert/strict";
import test from "node:test";

import { resolvePreviewOrigin } from "./preview-bot-upstream";

test("resolvePreviewOrigin prefers Origin header", () => {
  const request = {
    headers: new Headers({ origin: "http://localhost:3010" }),
    url: "http://localhost:3010/api/preview/bots/bot_1",
  } as unknown as import("next/server").NextRequest;

  assert.equal(resolvePreviewOrigin(request), "http://localhost:3010");
});

test("resolvePreviewOrigin falls back to host header", () => {
  const request = {
    headers: new Headers({ host: "localhost:3010" }),
    url: "http://localhost:3010/api/preview/bots/bot_1",
  } as unknown as import("next/server").NextRequest;

  assert.equal(resolvePreviewOrigin(request), "http://localhost:3010");
});
