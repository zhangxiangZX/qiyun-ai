import "reflect-metadata";

import assert from "node:assert/strict";
import test from "node:test";

import { Test } from "@nestjs/testing";

import { AuthAccessError } from "../../auth/auth.api";
import type { WorkspaceMemberRole } from "../../auth/auth.types";
import type { ApiRuntime } from "../../runtime";
import { API_RUNTIME } from "../runtime/runtime.tokens";
import { AuthModule } from "../auth/auth.module";
import { CalendarModule } from "./calendar.module";
import { CalendarRouteService } from "./calendar-route.service";

function buildRuntime(role: WorkspaceMemberRole): ApiRuntime {
  return {
    persist: async () => {},
    authApi: {
      authenticate: async () => ({
        id: "user_1",
        email: "user@example.com",
        name: "User",
        activeWorkspaceId: "ws_a",
      }),
      assertWorkspaceAccess: async () => ({
        id: "ws_a",
        name: "Workspace A",
        slug: "workspace-a",
        role,
        isActive: true,
      }),
    },
    calendarApi: {
      listEvents: async () => [],
      getEvent: async () => null,
      createEvent: async (_workspaceId: string, input: Record<string, unknown>) => ({
        id: "evt_1",
        workspaceId: "ws_a",
        title: String(input.title ?? ""),
        start: String(input.start ?? ""),
        end: String(input.end ?? ""),
        kind: "follow_up",
        status: "pending",
        leadId: null,
        leadName: null,
        ownerName: null,
        note: null,
        createdAt: "2026-07-09T00:00:00.000Z",
        updatedAt: "2026-07-09T00:00:00.000Z",
      }),
      updateEvent: async () => null,
      deleteEvent: async () => true,
    },
  } as unknown as ApiRuntime;
}

function authHeaders(): Headers {
  return new Headers({
    authorization: "Bearer valid-token",
    "x-workspace-id": "ws_a",
    "content-type": "application/json",
  });
}

test("viewer cannot create calendar events", async () => {
  const moduleRef = await Test.createTestingModule({
    imports: [AuthModule, CalendarModule],
  })
    .overrideProvider(API_RUNTIME)
    .useValue(buildRuntime("viewer"))
    .compile();

  const service = moduleRef.get(CalendarRouteService);
  const request = new Request("http://localhost/calendar/events", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ title: "Follow up", start: "2026-07-10T09:00:00.000Z", end: "2026-07-10T09:30:00.000Z", kind: "follow_up" }),
  });

  await assert.rejects(
    () => service.handle(request, "/calendar/events"),
    (error: unknown) => error instanceof AuthAccessError,
  );
  await moduleRef.close();
});

test("viewer cannot update or delete calendar events", async () => {
  const moduleRef = await Test.createTestingModule({
    imports: [AuthModule, CalendarModule],
  })
    .overrideProvider(API_RUNTIME)
    .useValue(buildRuntime("viewer"))
    .compile();

  const service = moduleRef.get(CalendarRouteService);

  const patchRequest = new Request("http://localhost/calendar/events/evt_1", {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({ status: "done" }),
  });
  await assert.rejects(
    () => service.handle(patchRequest, "/calendar/events/evt_1"),
    (error: unknown) => error instanceof AuthAccessError,
  );

  const deleteRequest = new Request("http://localhost/calendar/events/evt_1", {
    method: "DELETE",
    headers: authHeaders(),
  });
  await assert.rejects(
    () => service.handle(deleteRequest, "/calendar/events/evt_1"),
    (error: unknown) => error instanceof AuthAccessError,
  );

  await moduleRef.close();
});

test("member can create calendar events", async () => {
  const moduleRef = await Test.createTestingModule({
    imports: [AuthModule, CalendarModule],
  })
    .overrideProvider(API_RUNTIME)
    .useValue(buildRuntime("member"))
    .compile();

  const service = moduleRef.get(CalendarRouteService);
  const request = new Request("http://localhost/calendar/events", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ title: "Follow up", start: "2026-07-10T09:00:00.000Z", end: "2026-07-10T09:30:00.000Z", kind: "follow_up" }),
  });

  const result = await service.handle(request, "/calendar/events");
  assert.ok(result);
  assert.equal(result.status, 201);
  await moduleRef.close();
});
