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
  const body = (result.body as { data: Array<{ id: string }> }).data;
  assert.equal(body[0]?.id, "ws_a");
  await moduleRef.close();
});

test("workspace route service reads and updates company profile for active workspace", async () => {
  const now = new Date().toISOString();
  const moduleRef = await Test.createTestingModule({
    imports: [AuthModule],
  })
    .overrideProvider(API_RUNTIME)
    .useValue({
      authApi: {
        authenticate: async () => ({
          id: "owner_1",
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
        getWorkspaceById: async (_userId: string, workspaceId: string) => ({
          id: workspaceId,
          name: "Workspace A",
          slug: "workspace-a",
          ownerId: "owner_1",
          website: null,
          plan: null,
          contactName: null,
          contactEmail: null,
          contactPhone: null,
          provisionedByUserId: null,
          companyProfile: { companyName: "Foo" },
          createdAt: now,
          updatedAt: now,
        }),
        updateWorkspace: async (_userId: string, workspaceId: string, body: Record<string, unknown>) => ({
          id: workspaceId,
          name: "Workspace A",
          slug: "workspace-a",
          ownerId: "owner_1",
          website: null,
          plan: null,
          contactName: null,
          contactEmail: null,
          contactPhone: null,
          provisionedByUserId: null,
          companyProfile: body,
          createdAt: now,
          updatedAt: now,
        }),
      },
      persist: async () => {},
    } as unknown as ApiRuntime)
    .compile();

  const service = moduleRef.get(WorkspaceRouteService);

  const getRequest = new Request("http://localhost/workspaces/ws_a", {
    method: "GET",
    headers: {
      authorization: "Bearer valid-token",
      "x-workspace-id": "ws_a",
    },
  });
  const getResult = await service.handle(getRequest, "/workspaces/ws_a");
  assert.ok(getResult);
  assert.equal(getResult.status, 200);
  const getBody = (getResult.body as { data: { companyProfile?: Record<string, unknown> } }).data;
  assert.equal(getBody.companyProfile?.companyName, "Foo");

  const otherGet = new Request("http://localhost/workspaces/other", {
    method: "GET",
    headers: {
      authorization: "Bearer valid-token",
      "x-workspace-id": "ws_a",
    },
  });
  assert.equal((await service.handle(otherGet, "/workspaces/other"))?.status, 401);

  const patchRequest = new Request("http://localhost/workspaces/ws_a", {
    method: "PATCH",
    headers: {
      authorization: "Bearer valid-token",
      "x-workspace-id": "ws_a",
      "content-type": "application/json",
    },
    body: JSON.stringify({ companyName: "Bar" }),
  });
  const patchResult = await service.handle(patchRequest, "/workspaces/ws_a");
  assert.ok(patchResult);
  assert.equal(patchResult.status, 200);
  const patchBody = (patchResult.body as { data: { companyProfile?: Record<string, unknown> } }).data;
  assert.equal(patchBody.companyProfile?.companyName, "Bar");

  const otherPatch = new Request("http://localhost/workspaces/other", {
    method: "PATCH",
    headers: {
      authorization: "Bearer valid-token",
      "x-workspace-id": "ws_a",
      "content-type": "application/json",
    },
    body: JSON.stringify({ companyName: "X" }),
  });
  assert.equal((await service.handle(otherPatch, "/workspaces/other"))?.status, 401);

  await moduleRef.close();
});
