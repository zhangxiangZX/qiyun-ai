import assert from "node:assert/strict";
import test from "node:test";

import { DEFAULT_WORKSPACE_ID, resolveWorkspaceId } from "@/server/workspace";

test("resolveWorkspaceId prefers authenticated workspace over request header", () => {
  assert.equal(
    resolveWorkspaceId({
      authWorkspaceId: "ws_auth",
      headerWorkspaceId: "ws_header",
    }),
    "ws_auth",
  );
});

test("resolveWorkspaceId falls back to header for unauthenticated preview requests", () => {
  assert.equal(
    resolveWorkspaceId({
      authWorkspaceId: null,
      headerWorkspaceId: "ws_header",
    }),
    "ws_header",
  );
});

test("resolveWorkspaceId falls back to default workspace when no context exists", () => {
  assert.equal(
    resolveWorkspaceId({
      authWorkspaceId: null,
      headerWorkspaceId: null,
    }),
    DEFAULT_WORKSPACE_ID,
  );
});
