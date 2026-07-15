import "reflect-metadata";

import assert from "node:assert/strict";
import test from "node:test";

import type { ApiEnv } from "../config/env";
import { InMemoryAuthRepository } from "./auth.repository";
import { AuthService, AuthAccessError, AuthValidationError } from "./auth.service";
import { hashPassword, verifyPassword } from "./auth.crypto";
import {
  InMemoryWorkspaceInvitationMailer,
  InMemoryWorkspaceInvitationDeliveryAuditStore,
  InMemoryEmailLoginCodeMailer,
} from "./auth.mailer";
import type { UserRecord } from "./auth.types";

function buildService(repository: InMemoryAuthRepository): AuthService {
  const env = {
    NODE_ENV: "test",
    JWT_SECRET: "test-access-secret",
    JWT_REFRESH_SECRET: "test-refresh-secret",
  } as ApiEnv;

  return new AuthService(
    repository,
    env,
    new InMemoryWorkspaceInvitationMailer(),
    new InMemoryWorkspaceInvitationDeliveryAuditStore(),
    new InMemoryEmailLoginCodeMailer(),
  );
}

function makeUser(overrides: Partial<UserRecord> = {}): UserRecord {
  const now = new Date().toISOString();
  return {
    id: `user_${Math.random().toString(36).slice(2)}`,
    email: `user_${Math.random().toString(36).slice(2)}@example.com`,
    passwordHash: hashPassword("OldPass123"),
    name: "Test User",
    status: "active",
    activeWorkspaceId: null,
    platformRole: null,
    mustChangePassword: true,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

test("changePassword clears mustChangePassword and updates the password", async () => {
  const repository = new InMemoryAuthRepository();
  const user = await repository.createUser(makeUser());
  const service = buildService(repository);

  const result = await service.changePassword(user.id, "NewPass123");

  assert.equal(result.user.mustChangePassword, false);
  assert.equal(result.user.id, user.id);
  assert.ok(result.tokens.accessToken);
  assert.ok(result.tokens.refreshToken);

  const refreshed = await repository.findUserById(user.id);
  assert.ok(refreshed);
  assert.equal(refreshed!.mustChangePassword, false);
  assert.ok(verifyPassword("NewPass123", refreshed!.passwordHash));
  assert.ok(!verifyPassword("OldPass123", refreshed!.passwordHash));
});

test("changePassword rejects passwords shorter than 8 characters", async () => {
  const repository = new InMemoryAuthRepository();
  const user = await repository.createUser(makeUser());
  const service = buildService(repository);

  await assert.rejects(
    () => service.changePassword(user.id, "abc1"),
    (error) => error instanceof AuthValidationError,
  );
});

test("changePassword rejects passwords without letters and numbers", async () => {
  const repository = new InMemoryAuthRepository();
  const user = await repository.createUser(makeUser());
  const service = buildService(repository);

  // 纯字母，缺少数字
  await assert.rejects(
    () => service.changePassword(user.id, "allletters"),
    (error) => error instanceof AuthValidationError,
  );
  // 纯数字，缺少字母
  await assert.rejects(
    () => service.changePassword(user.id, "12345678"),
    (error) => error instanceof AuthValidationError,
  );
});

test("changePassword rejects unknown users", async () => {
  const repository = new InMemoryAuthRepository();
  const service = buildService(repository);

  await assert.rejects(
    () => service.changePassword("user_missing", "NewPass123"),
    (error) => error instanceof AuthAccessError,
  );
});

test("login surfaces mustChangePassword flag for users that still need a reset", async () => {
  const repository = new InMemoryAuthRepository();
  const user = await repository.createUser(makeUser({ mustChangePassword: true }));
  const service = buildService(repository);

  const result = await service.login({ email: user.email, password: "OldPass123" });

  assert.equal(result.user.mustChangePassword, true);
});

test("login surfaces mustChangePassword false for users that already reset", async () => {
  const repository = new InMemoryAuthRepository();
  const user = await repository.createUser(makeUser({ mustChangePassword: false }));
  const service = buildService(repository);

  const result = await service.login({ email: user.email, password: "OldPass123" });

  assert.equal(result.user.mustChangePassword, false);
});
