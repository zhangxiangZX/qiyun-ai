import assert from "node:assert/strict";
import test from "node:test";

import {
  isWithinAnalyticsRange,
  matchesAnalyticsBot,
  parseAnalyticsQuery,
} from "./analytics-query";

test("parseAnalyticsQuery accepts from/to/botId", () => {
  const params = new URLSearchParams(
    "from=2026-06-01&to=2026-06-30&botId=bot_1&ignored=1",
  );
  assert.deepEqual(parseAnalyticsQuery(params), {
    from: "2026-06-01",
    to: "2026-06-30",
    botId: "bot_1",
  });
});

test("isWithinAnalyticsRange filters by inclusive day boundaries", () => {
  const query = { from: "2026-06-01", to: "2026-06-02" };
  assert.equal(isWithinAnalyticsRange("2026-05-31T23:59:59.000Z", query), false);
  assert.equal(isWithinAnalyticsRange("2026-06-01T00:00:00.000Z", query), true);
  assert.equal(isWithinAnalyticsRange("2026-06-02T23:59:59.000Z", query), true);
  assert.equal(isWithinAnalyticsRange("2026-06-03T00:00:00.000Z", query), false);
});

test("matchesAnalyticsBot filters by botId when provided", () => {
  assert.equal(matchesAnalyticsBot({ botId: "bot_a" }, {}), true);
  assert.equal(matchesAnalyticsBot({ botId: "bot_a" }, { botId: "bot_a" }), true);
  assert.equal(matchesAnalyticsBot({ botId: "bot_a" }, { botId: "bot_b" }), false);
});
