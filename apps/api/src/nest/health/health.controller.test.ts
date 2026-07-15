import "reflect-metadata";

import assert from "node:assert/strict";
import test from "node:test";

import { Test } from "@nestjs/testing";

import type { HealthSnapshot } from "../../health/health.types";
import type { ApiRuntime } from "../../runtime";
import { API_RUNTIME } from "../runtime/runtime.tokens";
import { HealthController } from "./health.controller";
import { HealthModule } from "./health.module";

function buildHealthSnapshot(status: HealthSnapshot["status"]): HealthSnapshot {
  return {
    status,
    driver: "memory",
    checkedAt: "2026-07-01T00:00:00.000Z",
    services: [
      {
        id: "api",
        label: "apps/api",
        status: "ok",
        driver: "memory",
        detail: "API process is running.",
      },
      {
        id: "postgres",
        label: "PostgreSQL",
        status: "skipped",
        driver: "memory",
        detail: "Memory runtime does not use PostgreSQL.",
      },
      {
        id: "redis",
        label: "Redis",
        status: "skipped",
        driver: "inline",
        detail: "Inline queue does not use Redis.",
      },
      {
        id: "qdrant",
        label: "Qdrant",
        status: "ok",
        driver: "memory",
        detail: "In-memory vector store is active.",
      },
      {
        id: "embedding",
        label: "Embedding Provider",
        status: "ok",
        driver: "simple",
        detail: "SimpleEmbeddingProvider is active with 12 dimensions.",
      },
      {
        id: "minio",
        label: "MinIO / Object Storage",
        status: "ok",
        driver: "local",
        detail: "Local document storage ready.",
      },
    ],
    checks: {
      api: "ok",
      database: {
        status: "skipped",
        detail: "Memory runtime does not use PostgreSQL.",
        driver: "memory",
      },
      redis: {
        status: "skipped",
        detail: "Inline queue does not use Redis.",
        driver: "inline",
      },
      vectorStore: {
        status: "ok",
        driver: "memory",
        detail: "In-memory vector store is active.",
      },
      embeddingProvider: {
        status: "ok",
        detail: "SimpleEmbeddingProvider is active with 12 dimensions.",
        driver: "simple",
      },
      objectStorage: {
        status: "ok",
        detail: "Local document storage ready.",
        driver: "local",
      },
    },
  };
}

function createMockRuntime(status: HealthSnapshot["status"]): ApiRuntime {
  return {
    driver: "memory",
    healthCheck: async () => buildHealthSnapshot(status),
  } as ApiRuntime;
}

test("health controller returns unified snapshot with 200 when ok", async () => {
  const moduleRef = await Test.createTestingModule({
    imports: [HealthModule],
    controllers: [HealthController],
  })
    .overrideProvider(API_RUNTIME)
    .useValue(createMockRuntime("ok"))
    .compile();

  const controller = moduleRef.get(HealthController);
  let statusCode = 0;
  const response = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(payload: unknown) {
      snapshotPayload = payload;
      return this;
    },
  };
  let snapshotPayload: unknown;

  await controller.getHealth(response as never);

  assert.equal(statusCode, 200);
  assert.equal((snapshotPayload as HealthSnapshot).status, "ok");
  assert.equal((snapshotPayload as HealthSnapshot).services.length, 6);
  await moduleRef.close();
});

test("health controller returns 503 when degraded", async () => {
  const moduleRef = await Test.createTestingModule({
    imports: [HealthModule],
    controllers: [HealthController],
  })
    .overrideProvider(API_RUNTIME)
    .useValue(createMockRuntime("degraded"))
    .compile();

  const controller = moduleRef.get(HealthController);
  let statusCode = 0;
  const response = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(payload: unknown) {
      snapshotPayload = payload;
      return this;
    },
  };
  let snapshotPayload: unknown;

  await controller.getHealth(response as never);

  assert.equal(statusCode, 503);
  assert.equal((snapshotPayload as HealthSnapshot).status, "degraded");
  await moduleRef.close();
});
