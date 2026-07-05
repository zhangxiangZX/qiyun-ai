import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";

import { POST } from "./route";

test("accept invite route returns unauthorized when cookies are missing", async () => {
  const request = new NextRequest(
    "http://localhost:3000/api/auth/workspace-invitations/token/demo/accept",
    { method: "POST" },
  );

  const response = await POST(request, {
    params: Promise.resolve({ token: "demo" }),
  });

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), {
    code: "UNAUTHORIZED",
    message: "No active session.",
  });
});

test("accept invite route accepts, activates workspace, and refreshes cookies", async () => {
  const originalFetch = global.fetch;
  const calls: string[] = [];

  global.fetch = (async (input: RequestInfo | URL, _init?: RequestInit) => {
    const url = String(input);
    calls.push(url);

    if (url.endsWith("/workspace-invitations/token/invite_123/accept")) {
      return new Response(
        JSON.stringify({
          id: "invite_123",
          workspaceId: "ws_target",
          workspaceName: "Target Workspace",
          email: "user@example.com",
          role: "member",
          status: "accepted",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }

    if (url.endsWith("/workspaces/ws_target/activate")) {
      return new Response(
        JSON.stringify({
          id: "ws_target",
          name: "Target Workspace",
          slug: "target-workspace",
          role: "member",
          isActive: true,
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }

    if (url.endsWith("/auth/refresh")) {
      return new Response(
        JSON.stringify({
          user: {
            id: "user_1",
            email: "user@example.com",
            name: "User One",
            activeWorkspaceId: "ws_target",
          },
          workspaces: [
            {
              id: "ws_target",
              name: "Target Workspace",
              slug: "target-workspace",
              role: "member",
              isActive: true,
            },
          ],
          tokens: {
            accessToken: "access_next",
            refreshToken: "refresh_next",
            expiresInSeconds: 3600,
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }

    return new Response("not found", { status: 404 });
  }) as typeof fetch;

  try {
    const request = new NextRequest(
      "http://localhost:3000/api/auth/workspace-invitations/token/invite_123/accept",
      {
        method: "POST",
        headers: {
          cookie:
            "qiyun_access_token=access_current; qiyun_refresh_token=refresh_current",
        },
      },
    );

    const response = await POST(request, {
      params: Promise.resolve({ token: "invite_123" }),
    });

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      id: "invite_123",
      workspaceId: "ws_target",
      workspaceName: "Target Workspace",
      email: "user@example.com",
      role: "member",
      status: "accepted",
    });
    assert.deepEqual(calls, [
      "http://localhost:3001/workspace-invitations/token/invite_123/accept",
      "http://localhost:3001/workspaces/ws_target/activate",
      "http://localhost:3001/auth/refresh",
    ]);
    assert.match(response.headers.get("set-cookie") ?? "", /qiyun_access_token=access_next/);
  } finally {
    global.fetch = originalFetch;
  }
});
