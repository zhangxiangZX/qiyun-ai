import assert from "node:assert/strict";
import test from "node:test";

import { getApiPrefix, apiRequest } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { jsonResponse, withFetchMock } from "@/lib/test/console-fetch-mock";

test("getApiPrefix defaults to /api on server", () => {
  const original = process.env.API_BASE_URL;
  delete process.env.API_BASE_URL;
  try {
    assert.equal(getApiPrefix(), "/api");
  } finally {
    if (original === undefined) delete process.env.API_BASE_URL;
    else process.env.API_BASE_URL = original;
  }
});

test("getApiPrefix uses API_BASE_URL on server when configured", () => {
  const original = process.env.API_BASE_URL;
  process.env.API_BASE_URL = "http://internal:3001/";
  try {
    assert.equal(getApiPrefix(), "http://internal:3001");
  } finally {
    if (original === undefined) delete process.env.API_BASE_URL;
    else process.env.API_BASE_URL = original;
  }
});

test("apiRequest throws ApiError with upstream message on failure", async () => {
  await withFetchMock(
    (url) => {
      assert.match(url, /\/api\/dashboard$/);
      return jsonResponse({ code: "UNAUTHORIZED", message: "No active session." }, 401);
    },
    async () => {
      await assert.rejects(
        () => apiRequest("/dashboard"),
        (error: unknown) => {
          assert.ok(error instanceof ApiError);
          assert.equal(error.status, 401);
          assert.equal(error.code, "UNAUTHORIZED");
          assert.equal(error.message, "No active session.");
          return true;
        },
      );
    },
  );
});

test("apiRequest returns parsed JSON on success", async () => {
  await withFetchMock(
    (url) => {
      assert.match(url, /\/api\/bots$/);
      return jsonResponse([{ id: "bot_1", name: "Demo" }]);
    },
    async () => {
      const bots = await apiRequest<Array<{ id: string; name: string }>>("/bots");
      assert.deepEqual(bots, [{ id: "bot_1", name: "Demo" }]);
    },
  );
});
