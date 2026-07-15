import "reflect-metadata";

import assert from "node:assert/strict";
import test from "node:test";

import { Test } from "@nestjs/testing";

import type { RequestContext } from "../../workspace";
import type { ApiRuntime } from "../../runtime";
import { API_RUNTIME } from "../runtime/runtime.tokens";
import { AuthModule } from "../auth/auth.module";
import { DocumentsModule } from "./documents.module";
import { DocumentsRouteService } from "./documents-route.service";

test("documents route service lists knowledge bases for resolved workspace", async () => {
  const moduleRef = await Test.createTestingModule({
    imports: [AuthModule, DocumentsModule],
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
      documentApi: {
        listKnowledgeBases: async (context: RequestContext) => [
          {
            id: "kb_a",
            workspaceId: context.workspaceId,
            name: "KB A",
            status: "active",
            documentCount: 0,
            readyDocumentCount: 0,
            failedDocumentCount: 0,
            createdAt: "2026-07-01T00:00:00.000Z",
            updatedAt: "2026-07-01T00:00:00.000Z",
          },
        ],
        listDeadLetterJobs: async () => ({
          backend: "memory",
          available: true,
          total: 0,
          items: [],
        }),
      },
    } as unknown as ApiRuntime)
    .compile();

  const service = moduleRef.get(DocumentsRouteService);
  const request = new Request("http://localhost/knowledge-bases", {
    method: "GET",
    headers: {
      authorization: "Bearer valid-token",
      "x-workspace-id": "ws_a",
    },
  });
  const result = await service.handle(request, "/knowledge-bases");

  assert.ok(result);
  assert.equal(result.status, 200);
  const body = (result.body as { data: Array<{ workspaceId: string }> }).data;
  assert.equal(body.length, 1);
  assert.equal(body[0]?.workspaceId, "ws_a");
  await moduleRef.close();
});
