import assert from "node:assert/strict";
import test from "node:test";

import { DEFAULT_LEAD_FIELDS, resolveLeadFields } from "./lead-fields";

test("resolveLeadFields falls back to industrial defaults", () => {
  assert.deepEqual(resolveLeadFields(undefined), [...DEFAULT_LEAD_FIELDS]);
  assert.deepEqual(resolveLeadFields([]), [...DEFAULT_LEAD_FIELDS]);
  assert.deepEqual(resolveLeadFields(["name", "phone"]), ["name", "phone"]);
});
