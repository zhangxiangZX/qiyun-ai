import "reflect-metadata";

import assert from "node:assert/strict";
import test from "node:test";

import { Test } from "@nestjs/testing";

import type { ApiRuntime } from "../../runtime";
import { API_RUNTIME } from "../runtime/runtime.tokens";
import { AuthModule } from "./auth.module";
import { AuthRouteService } from "./auth-route.service";

test("auth route service refreshes tokens", async () => {
  const moduleRef = await Test.createTestingModule({
    imports: [AuthModule],
  })
    .overrideProvider(API_RUNTIME)
    .useValue({
      authApi: {
        refresh: async () => ({
          accessToken: "new-access",
          refreshToken: "new-refresh",
        }),
      },
      persist: async () => {},
    } as unknown as ApiRuntime)
    .compile();

  const service = moduleRef.get(AuthRouteService);
  const request = new Request("http://localhost/auth/refresh", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ refreshToken: "valid" }),
  });
  const result = await service.handle(request, "/auth/refresh");

  assert.ok(result);
  assert.equal(result.status, 200);
  const body = result.body as { accessToken: string };
  assert.equal(body.accessToken, "new-access");
  await moduleRef.close();
});
