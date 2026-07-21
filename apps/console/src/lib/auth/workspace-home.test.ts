import assert from "node:assert/strict";
import test from "node:test";

import {
  canAccessRoleHomePath,
  isRoleHomePath,
  resolveActiveWorkspace,
  resolveWorkspaceHomePath,
  resolveWorkspaceHomePathFromSession,
  roleHomeNavIdForRole,
} from "@/lib/auth/workspace-home";

test("resolveWorkspaceHomePath maps roles to role dashboards", () => {
  assert.equal(resolveWorkspaceHomePath("owner"), "/dashboard/boss");
  assert.equal(resolveWorkspaceHomePath("admin"), "/dashboard/admin");
  assert.equal(resolveWorkspaceHomePath("member"), "/dashboard/sales-rep");
  assert.equal(resolveWorkspaceHomePath(), "/dashboard/sales-rep");
});

test("role home access is exclusive to the mapped path", () => {
  assert.equal(isRoleHomePath("/dashboard/boss"), true);
  assert.equal(isRoleHomePath("/dashboard/inquiries"), false);
  assert.equal(canAccessRoleHomePath("owner", "/dashboard/boss"), true);
  assert.equal(canAccessRoleHomePath("owner", "/dashboard/admin"), false);
  assert.equal(canAccessRoleHomePath("admin", "/dashboard/admin"), true);
  assert.equal(canAccessRoleHomePath("member", "/dashboard/sales-rep"), true);
  assert.equal(canAccessRoleHomePath("member", "/dashboard/boss"), false);
  assert.equal(canAccessRoleHomePath("owner", "/dashboard/inquiries"), true);
  assert.equal(roleHomeNavIdForRole("owner"), "boss-home");
  assert.equal(roleHomeNavIdForRole("admin"), "admin-home");
  assert.equal(roleHomeNavIdForRole("member"), "sales-rep-home");
});

test("resolveActiveWorkspace prefers active flag and falls back to activeWorkspaceId", () => {
  const workspaces = [
    { id: "ws_1", name: "A", slug: "a", role: "member" as const, isActive: false },
    { id: "ws_2", name: "B", slug: "b", role: "admin" as const, isActive: true },
  ];

  assert.equal(resolveActiveWorkspace(workspaces, "ws_1")?.id, "ws_2");
  assert.equal(resolveActiveWorkspace([{ ...workspaces[0], isActive: false }], "ws_1")?.id, "ws_1");
  assert.equal(resolveActiveWorkspace(null)?.id, undefined);
  assert.equal(resolveActiveWorkspace(undefined)?.id, undefined);
  assert.equal(resolveActiveWorkspace([])?.id, undefined);
});

test("resolveWorkspaceHomePathFromSession uses active workspace role", () => {
  const session = {
    authenticated: true,
    user: {
      id: "user_1",
      email: "owner@example.com",
      name: "Owner",
      activeWorkspaceId: "ws_owner",
      platformRole: null,
    },
    workspaces: [
      { id: "ws_owner", name: "Owner", slug: "owner", role: "owner" as const, isActive: true },
    ],
  };

  assert.equal(resolveWorkspaceHomePathFromSession(session), "/dashboard/boss");
});
