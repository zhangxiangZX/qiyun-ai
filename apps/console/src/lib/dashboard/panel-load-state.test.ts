import assert from "node:assert/strict";
import test from "node:test";

import { resolvePanelContentKind } from "@/lib/dashboard/panel-load-state";

test("resolvePanelContentKind maps panel load states for dashboard sub-panels", () => {
  assert.equal(resolvePanelContentKind("loading", 0), "loading");
  assert.equal(resolvePanelContentKind("loading", 3), "loading");
  assert.equal(resolvePanelContentKind("error", 0), "error");
  assert.equal(resolvePanelContentKind("error", 2), "error");
  assert.equal(resolvePanelContentKind("ready", 0), "empty");
  assert.equal(resolvePanelContentKind("ready", 2), "data");
});
