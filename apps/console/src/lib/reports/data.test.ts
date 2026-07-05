import assert from "node:assert/strict";
import test from "node:test";

import { loadReportSnapshot } from "@/lib/reports/data";
import { ApiError } from "@/lib/api/errors";
import { jsonResponse, previewModeInfo, upstreamModeInfo, withFetchMock } from "@/lib/test/console-fetch-mock";

test("loadReportSnapshot uses preview mock in preview mode", async () => {
  await withFetchMock(
    (url) => {
      if (url.includes("/console/mode")) return jsonResponse(previewModeInfo);
      return jsonResponse({ code: "NOT_FOUND" }, 404);
    },
    async () => {
      const snapshot = await loadReportSnapshot();
      assert.equal(snapshot.hasBots, true);
    },
  );
});

test("loadReportSnapshot propagates upstream failures", async () => {
  await withFetchMock(
    (url) => {
      if (url.includes("/console/mode")) return jsonResponse(upstreamModeInfo);
      if (url.includes("/api/reports")) {
        return jsonResponse({ code: "UNAUTHORIZED", message: "No active session." }, 401);
      }
      return jsonResponse({ code: "NOT_FOUND" }, 404);
    },
    async () => {
      await assert.rejects(
        () => loadReportSnapshot(),
        (error: unknown) => {
          assert.ok(error instanceof ApiError);
          assert.equal(error.status, 401);
          return true;
        },
      );
    },
  );
});

test("loadReportSnapshot forwards analytics query params in upstream mode", async () => {
  await withFetchMock(
    (url) => {
      if (url.includes("/console/mode")) return jsonResponse(upstreamModeInfo);
      if (url.includes("/api/reports?from=2026-06-01&to=2026-06-07&botId=bot_a")) {
        return jsonResponse({ hasBots: true, period: {}, trend7: [], trend30: [], botMetrics: [], frequentQuestions: [], unresolvedQuestions: [], topCitations: [] });
      }
      return jsonResponse({ code: "NOT_FOUND" }, 404);
    },
    async () => {
      const snapshot = await loadReportSnapshot({
        from: "2026-06-01",
        to: "2026-06-07",
        botId: "bot_a",
      });
      assert.equal(snapshot.hasBots, true);
    },
  );
});
