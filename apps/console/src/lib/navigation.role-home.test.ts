import assert from "node:assert/strict";
import test from "node:test";

import { getNavigationGroups } from "@/lib/navigation";

test("sidebar workspace group only keeps the current role home", () => {
  const ownerGroups = getNavigationGroups(null, "owner");
  const ownerHomes = ownerGroups.find((group) => group.id === "workspace")?.children ?? [];
  assert.deepEqual(
    ownerHomes.map((item) => item.id),
    ["boss-home"],
  );

  const adminHomes =
    getNavigationGroups(null, "admin").find((group) => group.id === "workspace")?.children ?? [];
  assert.deepEqual(
    adminHomes.map((item) => item.id),
    ["admin-home"],
  );

  const salesHomes =
    getNavigationGroups(null, "member").find((group) => group.id === "workspace")?.children ?? [];
  assert.deepEqual(
    salesHomes.map((item) => item.id),
    ["sales-rep-home"],
  );
});

test("platform admin nav is unchanged by workspace role", () => {
  const groups = getNavigationGroups("platform_admin", "owner");
  assert.ok(groups.some((group) => group.id === "platform"));
  assert.equal(
    groups.find((group) => group.id === "workspace"),
    undefined,
  );
});
