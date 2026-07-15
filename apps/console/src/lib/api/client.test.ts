import assert from "node:assert/strict";
import test from "node:test";

import { getApiPrefix, apiRequest, apiFormDataRequest } from "@/lib/api/client";
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

test("apiRequest unwraps {code,message,data} envelope for array payloads", async () => {
  await withFetchMock(
    (url) => {
      assert.match(url, /\/api\/bots$/);
      return jsonResponse({ code: 0, message: "success", data: [{ id: "bot_1", name: "Demo" }] });
    },
    async () => {
      const bots = await apiRequest<Array<{ id: string; name: string }>>("/bots");
      assert.deepEqual(bots, [{ id: "bot_1", name: "Demo" }]);
    },
  );
});

test("apiRequest unwraps envelope for object payloads", async () => {
  await withFetchMock(
    (url) => {
      assert.match(url, /\/api\/things\/\w+$/);
      return jsonResponse({ code: 0, message: "success", data: { id: "x", name: "Y" } });
    },
    async () => {
      const item = await apiRequest<{ id: string; name: string }>("/things/x");
      assert.deepEqual(item, { id: "x", name: "Y" });
    },
  );
});

test("apiRequest leaves non-envelope (preview-mode) payloads untouched", async () => {
  // BFF 自有响应体（如 /console/mode 返回 {mode, upstreamConfigured, message}）
  // 不含数值 code===0，必须原样返回，不能被当信封解包。
  await withFetchMock(
    (url) => {
      assert.match(url, /\/api\/console\/mode$/);
      return jsonResponse({ mode: "preview", upstreamConfigured: false, message: "Preview" });
    },
    async () => {
      const info = await apiRequest<{ mode: string; upstreamConfigured: boolean }>("/console/mode");
      assert.equal(info.mode, "preview");
      assert.equal(info.upstreamConfigured, false);
    },
  );
});

test("apiFormDataRequest unwraps envelope for upload responses", async () => {
  await withFetchMock(
    (url) => {
      assert.match(url, /\/api\/files$/);
      return jsonResponse({ code: 0, message: "success", data: { id: "doc_1", name: "a.pdf" } });
    },
    async () => {
      const form = new FormData();
      form.append("file", new Blob(["x"]), "a.pdf");
      const doc = await apiFormDataRequest<{ id: string; name: string }>("/files", form);
      assert.deepEqual(doc, { id: "doc_1", name: "a.pdf" });
    },
  );
});
