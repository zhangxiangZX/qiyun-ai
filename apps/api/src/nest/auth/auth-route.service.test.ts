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
  const body = (result.body as { data: { accessToken: string } }).data;
  assert.equal(body.accessToken, "new-access");
  await moduleRef.close();
});

test("auth route service changes password for an authenticated user", async () => {
  const moduleRef = await Test.createTestingModule({
    imports: [AuthModule],
  })
    .overrideProvider(API_RUNTIME)
    .useValue({
      authApi: {
        authenticate: async (token: string) => {
          assert.equal(token, "valid-token");
          return {
            id: "user_1",
            email: "user@example.com",
            name: "User",
            activeWorkspaceId: null,
            platformRole: null,
            mustChangePassword: true,
          };
        },
        changePassword: async (userId: string, body: { newPassword?: string }) => {
          assert.equal(userId, "user_1");
          assert.equal(body.newPassword, "NewPass123");
          return {
            user: {
              id: "user_1",
              email: "user@example.com",
              name: "User",
              activeWorkspaceId: null,
              platformRole: null,
              mustChangePassword: false,
            },
            workspaces: [],
            tokens: {
              accessToken: "acc",
              refreshToken: "ref",
              expiresInSeconds: 3600,
            },
          };
        },
      },
      persist: async () => {},
    } as unknown as ApiRuntime)
    .compile();

  const service = moduleRef.get(AuthRouteService);
  const request = new Request("http://localhost/auth/change-password", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: "Bearer valid-token",
    },
    body: JSON.stringify({ newPassword: "NewPass123" }),
  });
  const result = await service.handle(request, "/auth/change-password");

  assert.ok(result);
  assert.equal(result.status, 200);
  const data = (result.body as { data: { user: { mustChangePassword: boolean } } }).data;
  assert.equal(data.user.mustChangePassword, false);
  await moduleRef.close();
});

test("auth route service rejects change-password without a bearer token", async () => {
  const moduleRef = await Test.createTestingModule({
    imports: [AuthModule],
  })
    .overrideProvider(API_RUNTIME)
    .useValue({
      authApi: {
        authenticate: async () => {
          throw new Error("unauthorized");
        },
        changePassword: async () => {
          throw new Error("should not be called");
        },
      },
      persist: async () => {},
    } as unknown as ApiRuntime)
    .compile();

  const service = moduleRef.get(AuthRouteService);
  const request = new Request("http://localhost/auth/change-password", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ newPassword: "NewPass123" }),
  });
  const result = await service.handle(request, "/auth/change-password");

  assert.ok(result);
  assert.equal(result.status, 401);
  await moduleRef.close();
});

