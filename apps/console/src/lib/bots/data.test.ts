import assert from "node:assert/strict";
import test from "node:test";

import { canPersistBots, createBot, getBotDetail, saveBot } from "@/lib/bots/data";
import { ApiError } from "@/lib/api/errors";
import { jsonResponse, previewModeInfo, upstreamModeInfo, withFetchMock } from "@/lib/test/console-fetch-mock";

test("getBotDetail returns preview mock in preview mode", async () => {
  await withFetchMock(
    (url) => {
      if (url.includes("/console/mode")) return jsonResponse(previewModeInfo);
      return jsonResponse({ code: "NOT_FOUND" }, 404);
    },
    async () => {
      const detail = await getBotDetail("bot-support");
      assert.ok(detail);
      assert.equal(detail.id, "bot-support");
    },
  );
});

test("getBotDetail propagates upstream load errors", async () => {
  await withFetchMock(
    (url) => {
      if (url.includes("/console/mode")) return jsonResponse(upstreamModeInfo);
      if (url.endsWith("/api/bots/bot_1")) {
        return jsonResponse({ code: "INTERNAL_ERROR", message: "Upstream down." }, 500);
      }
      return jsonResponse({ code: "NOT_FOUND" }, 404);
    },
    async () => {
      await assert.rejects(
        () => getBotDetail("bot_1"),
        (error: unknown) => {
          assert.ok(error instanceof ApiError);
          assert.equal(error.status, 500);
          return true;
        },
      );
    },
  );
});

test("getBotDetail returns null for missing bot in upstream mode", async () => {
  await withFetchMock(
    (url) => {
      if (url.includes("/console/mode")) return jsonResponse(upstreamModeInfo);
      if (url.endsWith("/api/bots/missing")) {
        return jsonResponse({ code: "NOT_FOUND", message: "Bot not found." }, 404);
      }
      if (url.endsWith("/api/bots")) return jsonResponse([]);
      return jsonResponse({ code: "NOT_FOUND" }, 404);
    },
    async () => {
      const detail = await getBotDetail("missing");
      assert.equal(detail, null);
    },
  );
});

test("canPersistBots is false in preview mode", async () => {
  await withFetchMock(
    (url) => {
      if (url.includes("/console/mode")) return jsonResponse(previewModeInfo);
      return jsonResponse({ code: "NOT_FOUND" }, 404);
    },
    async () => {
      const result = await canPersistBots();
      assert.equal(result, false);
    },
  );
});

test("createBot rejects in preview mode", async () => {
  await withFetchMock(
    (url) => {
      if (url.includes("/console/mode")) return jsonResponse(previewModeInfo);
      return jsonResponse({ code: "NOT_FOUND" }, 404);
    },
    async () => {
      await assert.rejects(
        () => createBot("Preview Bot"),
        /Preview mode: bots cannot be created/i,
      );
    },
  );
});

test("saveBot rejects in preview mode", async () => {
  await withFetchMock(
    (url) => {
      if (url.includes("/console/mode")) return jsonResponse(previewModeInfo);
      return jsonResponse({ code: "NOT_FOUND" }, 404);
    },
    async () => {
      const bot = await getBotDetail("bot-support");
      assert.ok(bot);
      await assert.rejects(
        () => saveBot(bot),
        /Preview mode: bot changes cannot be saved/i,
      );
    },
  );
});
