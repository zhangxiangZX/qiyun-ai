import "reflect-metadata";

import assert from "node:assert/strict";
import test from "node:test";

import { Test } from "@nestjs/testing";

import type { RequestContext } from "../../workspace";
import type { ApiRuntime } from "../../runtime";
import { API_RUNTIME } from "../runtime/runtime.tokens";
import { AuthModule } from "./auth.module";
import { WorkspaceRouteService } from "./workspace-route.service";

test("workspace route service lists workspaces for resolved context", async () => {
  const moduleRef = await Test.createTestingModule({
    imports: [AuthModule],
  })
    .overrideProvider(API_RUNTIME)
    .useValue({
      authApi: {
        authenticate: async () => ({
          id: "user_1",
          email: "owner@example.com",
          name: "Owner",
          activeWorkspaceId: "ws_a",
        }),
        assertWorkspaceAccess: async () => ({
          id: "ws_a",
          name: "Workspace A",
          slug: "workspace-a",
          role: "owner",
          isActive: true,
        }),
        listWorkspaces: async (context: RequestContext) => [
          { id: context.workspaceId, name: "Workspace A", role: "owner" },
        ],
      },
      persist: async () => {},
    } as unknown as ApiRuntime)
    .compile();

  const service = moduleRef.get(WorkspaceRouteService);
  const request = new Request("http://localhost/workspaces", {
    method: "GET",
    headers: {
      authorization: "Bearer valid-token",
      "x-workspace-id": "ws_a",
    },
  });
  const result = await service.handle(request, "/workspaces");

  assert.ok(result);
  assert.equal(result.status, 200);
  const body = result.body as Array<{ id: string }>;
  assert.equal(body[0]?.id, "ws_a");
  await moduleRef.close();
});
