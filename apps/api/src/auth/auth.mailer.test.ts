import assert from "node:assert/strict";
import test from "node:test";

import {
  InMemoryWorkspaceInvitationDeliveryAuditStore,
  RetryingWorkspaceInvitationMailer,
  type WorkspaceInvitationEmail,
  type WorkspaceInvitationMailer,
} from "./auth.mailer";

const baseEmail: WorkspaceInvitationEmail = {
  invitationId: "invite_test",
  workspaceId: "ws_test",
  workspaceName: "Test Workspace",
  recipientEmail: "member@example.com",
  role: "member",
  inviteUrl: "http://localhost:3000/accept-invite?token=wsi_test",
  expiresAt: "2026-07-08T00:00:00.000Z",
  invitedByName: "Owner",
  invitedByEmail: "owner@example.com",
  sentAt: "2026-07-01T00:00:00.000Z",
};

test("retrying mailer records failed attempts before succeeding", async () => {
  const auditStore = new InMemoryWorkspaceInvitationDeliveryAuditStore();
  let attempts = 0;

  const flakyMailer: WorkspaceInvitationMailer = {
    async sendInvitation() {
      attempts += 1;
      if (attempts < 3) {
        throw new Error(`fail-${attempts}`);
      }
    },
  };

  const mailer = new RetryingWorkspaceInvitationMailer(
    "memory",
    flakyMailer,
    auditStore,
    {
      maxAttempts: 3,
      retryDelayMs: 0,
      randomId: () => `audit-${attempts}`,
    },
  );

  await mailer.sendInvitation(baseEmail);

  const audits = auditStore.listByInvitation(baseEmail.invitationId);
  assert.equal(audits.length, 3);
  assert.deepEqual(
    audits.map((entry) => entry.status),
    ["failed", "failed", "sent"],
  );
  assert.equal(audits[0]?.errorMessage, "fail-1");
  assert.equal(audits[1]?.errorMessage, "fail-2");
  assert.equal(audits[2]?.errorMessage, null);
});

test("retrying mailer throws after max attempts and keeps audits", async () => {
  const auditStore = new InMemoryWorkspaceInvitationDeliveryAuditStore();
  let attempts = 0;

  const failingMailer: WorkspaceInvitationMailer = {
    async sendInvitation() {
      attempts += 1;
      throw new Error(`hard-fail-${attempts}`);
    },
  };

  const mailer = new RetryingWorkspaceInvitationMailer(
    "resend",
    failingMailer,
    auditStore,
    {
      maxAttempts: 2,
      retryDelayMs: 0,
      randomId: () => `failure-${attempts}`,
    },
  );

  await assert.rejects(() => mailer.sendInvitation(baseEmail), /hard-fail-2/);

  const audits = auditStore.listByInvitation(baseEmail.invitationId);
  assert.equal(audits.length, 2);
  assert.ok(audits.every((entry) => entry.status === "failed"));
  assert.deepEqual(
    audits.map((entry) => entry.attempt),
    [1, 2],
  );
});
