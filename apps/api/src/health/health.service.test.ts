import assert from "node:assert/strict";
import test from "node:test";

import {
  buildHealthSnapshot,
  collectHealthSnapshot,
  isHealthDegraded,
  probeMinioHealth,
  probeQdrantHealth,
  toLegacyHealthChecks,
} from "./health.service";
import type { HealthServiceCheck } from "./health.types";

function baseServices(overrides: Partial<Record<string, Partial<HealthServiceCheck>>> = {}) {
  const defaults: HealthServiceCheck[] = [
    {
      id: "api",
      label: "apps/api",
      status: "ok",
      driver: "postgres",
      detail: "API process is running.",
    },
    {
      id: "postgres",
      label: "PostgreSQL",
      status: "ok",
      driver: "postgres",
      detail: "PostgreSQL reachable.",
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
      driver: "qdrant",
      detail: "Qdrant collection qiyun_chunks is reachable.",
    },
    {
      id: "embedding",
      label: "Embedding Provider",
      status: "ok",
      driver: "openai-compatible",
      detail: "OpenAI-compatible embedding provider is configured.",
    },
    {
      id: "minio",
      label: "MinIO / Object Storage",
      status: "ok",
      driver: "minio",
      detail: "MinIO bucket is reachable.",
    },
  ];

  return defaults.map((service) => ({
    ...service,
    ...(overrides[service.id] ?? {}),
  }));
}

test("buildHealthSnapshot returns unified services in stable order", () => {
  const snapshot = buildHealthSnapshot({
    runtimeDriver: "postgres",
    services: [
      baseServices()[5]!,
      baseServices()[0]!,
      baseServices()[1]!,
      baseServices()[2]!,
      baseServices()[3]!,
      baseServices()[4]!,
    ],
    checkedAt: "2026-07-01T00:00:00.000Z",
  });

  assert.equal(snapshot.status, "ok");
  assert.equal(snapshot.services.length, 6);
  assert.deepEqual(
    snapshot.services.map((service) => service.id),
    ["api", "postgres", "redis", "qdrant", "embedding", "minio"],
  );
  assert.equal(snapshot.checks.database.driver, "postgres");
  assert.equal(snapshot.checks.embeddingProvider.driver, "openai-compatible");
  assert.equal(snapshot.checks.objectStorage.driver, "minio");
});

test("isHealthDegraded is true when any service reports error", () => {
  const services = baseServices({
    qdrant: {
      status: "error",
      detail: "Qdrant unreachable.",
    },
  });

  assert.equal(isHealthDegraded(services), true);
  const snapshot = buildHealthSnapshot({
    runtimeDriver: "postgres",
    services,
  });
  assert.equal(snapshot.status, "degraded");
  assert.equal(snapshot.checks.vectorStore.status, "error");
});

test("collectHealthSnapshot probes postgres redis qdrant and minio in parallel", async () => {
  const calls: string[] = [];
  const snapshot = await collectHealthSnapshot({
    runtimeDriver: "postgres",
    isRedisQueueEnabled: true,
    pingPostgres: async () => {
      calls.push("postgres");
    },
    pingRedis: async () => {
      calls.push("redis");
      return "PONG";
    },
    getVectorStoreHealth: async () => {
      calls.push("qdrant");
      return {
        driver: "qdrant",
        status: "ok",
        detail: "Qdrant collection qiyun_chunks is reachable.",
      };
    },
    getEmbeddingProviderHealth: async () => {
      calls.push("embedding");
      return {
        driver: "openai-compatible",
        status: "ok",
        detail: "OpenAI-compatible embedding provider is configured.",
      };
    },
    getObjectStorageHealth: async () => {
      calls.push("minio");
      return {
        status: "ok",
        driver: "minio",
        detail: "MinIO bucket is reachable.",
      };
    },
  });

  assert.deepEqual(new Set(calls), new Set(["postgres", "redis", "qdrant", "embedding", "minio"]));
  assert.equal(snapshot.services.length, 6);
  assert.equal(snapshot.checks.redis.status, "ok");
  assert.equal(snapshot.checks.embeddingProvider.status, "ok");
  assert.equal(snapshot.checks.objectStorage.status, "ok");
});

test("memory runtime marks postgres as skipped in legacy checks", async () => {
  const snapshot = await collectHealthSnapshot({
    runtimeDriver: "memory",
    isRedisQueueEnabled: false,
    pingPostgres: async () => {
      throw new Error("should not ping postgres");
    },
    pingRedis: async () => "PONG",
    getVectorStoreHealth: async () => ({
      driver: "memory",
      status: "ok",
      detail: "In-memory vector store is active.",
    }),
    getEmbeddingProviderHealth: async () => ({
      driver: "simple",
      status: "ok",
      detail: "SimpleEmbeddingProvider is active with 12 dimensions.",
    }),
    getObjectStorageHealth: async () => ({
      status: "ok",
      driver: "local",
      detail: "Local document storage ready.",
    }),
  });

  assert.equal(snapshot.checks.database.status, "skipped");
  assert.equal(snapshot.checks.database.driver, "memory");
  assert.equal(snapshot.checks.redis.status, "skipped");
  assert.equal(snapshot.checks.embeddingProvider.driver, "simple");
  assert.equal(snapshot.status, "ok");
});

test("probe helpers normalize qdrant and minio detail", () => {
  const qdrant = probeQdrantHealth({
    driver: "qdrant",
    status: "error",
    detail: "Serving RAG from repository fallback.",
  });
  const minio = probeMinioHealth({
    status: "error",
    driver: "minio",
    detail: "MINIO_ACCESS_KEY or MINIO_SECRET_KEY is not configured.",
  });

  assert.equal(qdrant.id, "qdrant");
  assert.equal(qdrant.status, "error");
  assert.equal(minio.id, "minio");
  assert.equal(minio.status, "error");

  const legacy = toLegacyHealthChecks([
    baseServices()[0]!,
    baseServices()[1]!,
    baseServices()[2]!,
    qdrant,
    baseServices()[4]!,
    minio,
  ]);
  assert.equal(legacy.vectorStore.status, "error");
  assert.equal(legacy.embeddingProvider.status, "ok");
  assert.equal(legacy.objectStorage.status, "error");
});
