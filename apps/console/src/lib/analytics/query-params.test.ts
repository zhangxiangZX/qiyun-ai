import assert from "node:assert/strict";
import test from "node:test";

import { buildAnalyticsRequestPath } from "@/lib/analytics/query-params";

test("buildAnalyticsRequestPath appends from/to/botId", () => {
  assert.equal(
    buildAnalyticsRequestPath("/reports", {
      from: "2026-06-01",
      to: "2026-06-30",
      botId: "bot_1",
    }),
    "/reports?from=2026-06-01&to=2026-06-30&botId=bot_1",
  );
  assert.equal(buildAnalyticsRequestPath("/dashboard"), "/dashboard");
});
