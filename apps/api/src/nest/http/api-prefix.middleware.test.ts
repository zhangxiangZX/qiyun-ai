import assert from "node:assert/strict";
import test from "node:test";

import { stripApiV1Prefix } from "./api-prefix.middleware";

test("stripApiV1Prefix removes version prefix from nested paths", () => {
  assert.equal(stripApiV1Prefix("/api/v1/knowledge-bases"), "/knowledge-bases");
  assert.equal(stripApiV1Prefix("/api/v1"), "/");
  assert.equal(stripApiV1Prefix("/health"), "/health");
});
