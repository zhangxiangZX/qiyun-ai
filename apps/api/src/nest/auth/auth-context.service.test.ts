import "reflect-metadata";

import assert from "node:assert/strict";
import test from "node:test";

import { Test } from "@nestjs/testing";

import { AuthAccessError } from "../../auth/auth.api";
import type { AuthUserPayload } from "../../auth/auth.types";
import type { ApiRuntime } from "../../runtime";
import { API_RUNTIME } from "../runtime/runtime.tokens";
import { AuthModule } from "./auth.module";
import { NestAuthContextService } from "./auth-context.service";
import { BearerAuthGuard } from "./guards/bearer-auth.guard";
import { WorkspaceAuthGuard } from "./guards/workspace-auth.guard";

function createHeaders(input: Record<string, string>): Headers {
  return new Headers(input);
}

function createRuntime(input?: {
  user?: AuthUserPayload;
  accessibleWorkspaces?: string[];
}): ApiRuntime {
  const user = input?.user ?? {
    id: "user_1",
    email: "owner@example.com",
    name: "Owner",
    activeWorkspaceId: "ws_home",
    platformRole: null,
  };
  const accessible = new Set(input?.accessibleWorkspaces ?? ["ws_home", "ws_other"]);

  return {
    authApi: {
      authenticate: async (token: string) => {
        if (token !== "valid-token") {
          throw new AuthAccessError("Invalid access token.");
        }
        return user;
      },
      assertWorkspaceAccess: async (userId: string, workspaceId: string) => {
        if (userId !== user.id || !accessible.has(workspaceId)) {
          throw new AuthAccessError("Workspace is not accessible.");
        }
        return {
          id: workspaceId,
          name: "Workspace",
          slug: workspaceId,
          role: "owner",
          isActive: workspaceId === user.activeWorkspaceId,
        };
      },
    },
  } as unknown as ApiRuntime;
}

test("bearer auth guard rejects missing token", async () => {
  const moduleRef = await Test.createTestingModule({
    imports: [AuthModule],
  })
    .overrideProvider(API_RUNTIME)
    .useValue(createRuntime())
    .compile();

  const guard = moduleRef.get(BearerAuthGuard);
  await assert.rejects(
    guard.assertBearerToken(createHeaders({})),
    /Missing bearer token/,
  );
  await moduleRef.close();
});

test("workspace auth guard enforces workspace header isolation", async () => {
  const moduleRef = await Test.createTestingModule({
    imports: [AuthModule],
  })
    .overrideProvider(API_RUNTIME)
    .useValue(createRuntime())
    .compile();

  const guard = moduleRef.get(WorkspaceAuthGuard);
  const allowed = await guard.resolveWorkspaceContext(
    createHeaders({ "x-workspace-id": "ws_home" }),
    {
      id: "user_1",
      email: "owner@example.com",
      name: "Owner",
      activeWorkspaceId: "ws_home",
      platformRole: null,
    },
  );
  assert.equal(allowed.workspaceId, "ws_home");

  await assert.rejects(
    guard.resolveWorkspaceContext(
      createHeaders({ "x-workspace-id": "ws_foreign" }),
      {
        id: "user_1",
        email: "owner@example.com",
        name: "Owner",
        activeWorkspaceId: "ws_home",
        platformRole: null,
      },
    ),
    /Workspace is not accessible/,
  );
  await moduleRef.close();
});

test("auth context service resolves bearer and workspace in sequence", async () => {
  const moduleRef = await Test.createTestingModule({
    imports: [AuthModule],
  })
    .overrideProvider(API_RUNTIME)
    .useValue(createRuntime())
    .compile();

  const service = moduleRef.get(NestAuthContextService);
  const context = await service.resolve(
    createHeaders({
      authorization: "Bearer valid-token",
      "x-workspace-id": "ws_other",
    }),
  );

  assert.equal(context.userId, "user_1");
  assert.equal(context.workspaceId, "ws_other");
  await moduleRef.close();
});
