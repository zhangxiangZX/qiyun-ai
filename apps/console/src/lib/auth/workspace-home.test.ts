import assert from "node:assert/strict";
import test from "node:test";

import {
  resolveActiveWorkspace,
  resolveWorkspaceHomePath,
  resolveWorkspaceHomePathFromSession,
} from "@/lib/auth/workspace-home";

test("resolveWorkspaceHomePath maps roles to role dashboards", () => {
  assert.equal(resolveWorkspaceHomePath("owner"), "/dashboard/boss");
  assert.equal(resolveWorkspaceHomePath("admin"), "/dashboard/admin");
  assert.equal(resolveWorkspaceHomePath("member"), "/dashboard/sales-rep");
  assert.equal(resolveWorkspaceHomePath(), "/dashboard/sales-rep");
});

test("resolveActiveWorkspace prefers active flag and falls back to activeWorkspaceId", () => {
  const workspaces = [
    { id: "ws_1", name: "A", slug: "a", role: "member" as const, isActive: false },
    { id: "ws_2", name: "B", slug: "b", role: "admin" as const, isActive: true },
  ];

  assert.equal(resolveActiveWorkspace(workspaces, "ws_1")?.id, "ws_2");
  assert.equal(resolveActiveWorkspace([{ ...workspaces[0], isActive: false }], "ws_1")?.id, "ws_1");
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
