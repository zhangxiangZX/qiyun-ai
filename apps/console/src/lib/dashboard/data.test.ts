import assert from "node:assert/strict";
import test from "node:test";

import { loadDashboardSnapshot } from "@/lib/dashboard/data";
import { ApiError } from "@/lib/api/errors";
import { jsonResponse, previewModeInfo, upstreamModeInfo, withFetchMock } from "@/lib/test/console-fetch-mock";

test("loadDashboardSnapshot uses preview mock in preview mode", async () => {
  await withFetchMock(
    (url) => {
      if (url.includes("/console/mode")) return jsonResponse(previewModeInfo);
      return jsonResponse({ code: "NOT_FOUND" }, 404);
    },
    async () => {
      const snapshot = await loadDashboardSnapshot();
      assert.equal(snapshot.hasBots, true);
      assert.ok(snapshot.kpis.length > 0);
    },
  );
});

test("loadDashboardSnapshot propagates upstream failures", async () => {
  await withFetchMock(
    (url) => {
      if (url.includes("/console/mode")) return jsonResponse(upstreamModeInfo);
      if (url.endsWith("/api/dashboard")) {
        return jsonResponse({ code: "INTERNAL_ERROR", message: "Dashboard unavailable." }, 503);
      }
      return jsonResponse({ code: "NOT_FOUND" }, 404);
    },
    async () => {
      await assert.rejects(
        () => loadDashboardSnapshot(),
        (error: unknown) => {
          assert.ok(error instanceof ApiError);
          assert.equal(error.status, 503);
          return true;
        },
      );
    },
  );
});

test("loadDashboardSnapshot returns upstream payload in upstream mode", async () => {
  const upstreamSnapshot = {
    hasBots: true,
    kpis: [],
    trend7: [],
    trend30: [],
    recentLeads: [],
    frequentQuestions: [],
    unresolvedQuestions: [],
  };

  await withFetchMock(
    (url) => {
      if (url.includes("/console/mode")) return jsonResponse(upstreamModeInfo);
      if (url.endsWith("/api/dashboard")) return jsonResponse(upstreamSnapshot);
      return jsonResponse({ code: "NOT_FOUND" }, 404);
    },
    async () => {
      const snapshot = await loadDashboardSnapshot();
      assert.deepEqual(snapshot, upstreamSnapshot);
    },
  );
});
