import assert from "node:assert/strict";
import test from "node:test";

import { getBotFromApi } from "@/lib/bots/api";
import { ApiError } from "@/lib/api/errors";
import { jsonResponse, withFetchMock } from "@/lib/test/console-fetch-mock";

const apiBot = {
  id: "bot_1",
  workspaceId: "ws_1",
  name: "Support",
  status: "active" as const,
  knowledgeBaseIds: ["kb_1"],
};

test("getBotFromApi returns mapped detail on success", async () => {
  await withFetchMock(
    (url) => {
      if (url.endsWith("/api/bots/bot_1")) return jsonResponse(apiBot);
      return jsonResponse({ code: "NOT_FOUND" }, 404);
    },
    async () => {
      const detail = await getBotFromApi("bot_1");
      assert.ok(detail);
      assert.equal(detail.id, "bot_1");
      assert.equal(detail.name, "Support");
      assert.equal(detail.status, "enabled");
    },
  );
});

test("getBotFromApi falls back to list on 404 and returns null when missing", async () => {
  await withFetchMock(
    (url) => {
      if (url.endsWith("/api/bots/missing")) {
        return jsonResponse({ code: "NOT_FOUND", message: "Bot not found." }, 404);
      }
      if (url.endsWith("/api/bots")) return jsonResponse([apiBot]);
      return jsonResponse({ code: "NOT_FOUND" }, 404);
    },
    async () => {
      const detail = await getBotFromApi("missing");
      assert.equal(detail, null);
    },
  );
});

test("getBotFromApi falls back to list on 404 and returns match when present", async () => {
  await withFetchMock(
    (url) => {
      if (url.endsWith("/api/bots/bot_1")) {
        return jsonResponse({ code: "NOT_FOUND", message: "Bot not found." }, 404);
      }
      if (url.endsWith("/api/bots")) return jsonResponse([apiBot]);
      return jsonResponse({ code: "NOT_FOUND" }, 404);
    },
    async () => {
      const detail = await getBotFromApi("bot_1");
      assert.ok(detail);
      assert.equal(detail?.id, "bot_1");
    },
  );
});

test("getBotFromApi rethrows non-404 failures", async () => {
  await withFetchMock(
    (url) => {
      if (url.endsWith("/api/bots/bot_1")) {
        return jsonResponse({ code: "INTERNAL_ERROR", message: "Upstream down." }, 500);
      }
      return jsonResponse({ code: "NOT_FOUND" }, 404);
    },
    async () => {
      await assert.rejects(
        () => getBotFromApi("bot_1"),
        (error: unknown) => {
          assert.ok(error instanceof ApiError);
          assert.equal(error.status, 500);
          return true;
        },
      );
    },
  );
});
