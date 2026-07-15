import "reflect-metadata";

import assert from "node:assert/strict";
import test from "node:test";

import { Test } from "@nestjs/testing";

import type { ApiRuntime } from "../../runtime";
import { API_RUNTIME } from "../runtime/runtime.tokens";
import { AuthModule } from "../auth/auth.module";
import { RoutingModule } from "./routing.module";
import { NestRouteDispatcher } from "./nest-route.dispatcher";

test("nest route dispatcher returns null for unknown routes", async () => {
  const moduleRef = await Test.createTestingModule({
    imports: [AuthModule, RoutingModule],
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
      },
    } as unknown as ApiRuntime)
    .compile();

  const dispatcher = moduleRef.get(NestRouteDispatcher);
  const request = new Request("http://localhost/unknown", { method: "GET" });
  const result = await dispatcher.dispatch(request, "/unknown");

  assert.equal(result, null);
  await moduleRef.close();
});
