import assert from "node:assert/strict";
import test from "node:test";

import { InMemoryAuthRepository } from "./auth.repository";
import {
  EmailLoginCodeMailer,
  InMemoryWorkspaceInvitationDeliveryAuditStore,
  WorkspaceInvitationMailer,
} from "./auth.mailer";
import { AuthAccessError, AuthApi } from "./auth.api";

function buildAuthApi(): AuthApi {
  const repository = new InMemoryAuthRepository();
  const now = new Date().toISOString();
  repository.createWorkspace({
    id: "ws_a",
    name: "Workspace A",
    slug: "workspace-a",
    ownerId: "owner_1",
    website: null,
    plan: null,
    contactName: null,
    contactEmail: null,
    contactPhone: null,
    provisionedByUserId: null,
    companyProfile: {},
    createdAt: now,
    updatedAt: now,
  });
  repository.upsertWorkspaceMember({ workspaceId: "ws_a", userId: "owner_1", role: "owner", createdAt: now });
  repository.upsertWorkspaceMember({ workspaceId: "ws_a", userId: "member_1", role: "member", createdAt: now });

  const mailer: WorkspaceInvitationMailer = { sendInvitation: async () => {} };
  const invitationAuditStore = new InMemoryWorkspaceInvitationDeliveryAuditStore();
  const emailLoginCodeMailer: EmailLoginCodeMailer = { sendCode: async () => {} };

  return new AuthApi(repository, {}, mailer, invitationAuditStore, emailLoginCodeMailer);
}

test("updateWorkspace merges profile patch into company_profile JSONB", async () => {
  const authApi = buildAuthApi();

  const before = await authApi.getWorkspaceById("owner_1", "ws_a");
  assert.deepEqual(before.companyProfile, {});

  const afterFirst = await authApi.updateWorkspace("owner_1", "ws_a", {
    companyName: "Foo Co",
    tags: ["industrial"],
  });
  assert.equal((afterFirst.companyProfile as Record<string, unknown>).companyName, "Foo Co");
  assert.deepEqual((afterFirst.companyProfile as Record<string, unknown>).tags, ["industrial"]);

  // 第二次更新应合并而非覆盖已有字段
  const afterSecond = await authApi.updateWorkspace("owner_1", "ws_a", {
    hotline: "400-000-0000",
  });
  const merged = afterSecond.companyProfile as Record<string, unknown>;
  assert.equal(merged.companyName, "Foo Co");
  assert.deepEqual(merged.tags, ["industrial"]);
  assert.equal(merged.hotline, "400-000-0000");
});

test("updateWorkspace rejects non-manager members", async () => {
  const authApi = buildAuthApi();
  await assert.rejects(
    () => authApi.updateWorkspace("member_1", "ws_a", { companyName: "Hacked" }),
    (error: unknown) => error instanceof AuthAccessError,
  );
});

test("getWorkspaceById requires workspace membership", async () => {
  const authApi = buildAuthApi();
  await assert.rejects(
    () => authApi.getWorkspaceById("member_1", "ws_missing"),
    (error: unknown) => error instanceof AuthAccessError,
  );
});
