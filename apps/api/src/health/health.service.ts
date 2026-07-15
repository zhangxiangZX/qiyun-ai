import type { DocumentStorageHealth } from "../documents/document-storage";
import type { EmbeddingProviderHealth } from "../rag/rag.types";
import type {
  HealthProbeStatus,
  HealthServiceCheck,
  HealthServiceId,
  HealthSnapshot,
  LegacyHealthChecks,
} from "./health.types";

export interface VectorStoreHealthProbe {
  driver: "memory" | "qdrant";
  status: "ok" | "error";
  detail?: string;
}

export interface HealthProbeDependencies {
  runtimeDriver: "memory" | "postgres";
  isRedisQueueEnabled: boolean;
  pingPostgres: () => Promise<void>;
  pingRedis: () => Promise<string>;
  getVectorStoreHealth: () => Promise<VectorStoreHealthProbe>;
  getEmbeddingProviderHealth: () => Promise<EmbeddingProviderHealth>;
  getObjectStorageHealth: () => Promise<DocumentStorageHealth>;
}

const SERVICE_ORDER: HealthServiceId[] = [
  "api",
  "postgres",
  "redis",
  "qdrant",
  "embedding",
  "minio",
];

export function isHealthDegraded(services: HealthServiceCheck[]): boolean {
  return services.some((service) => service.status === "error");
}

export function buildApiHealthCheck(runtimeDriver: "memory" | "postgres"): HealthServiceCheck {
  return {
    id: "api",
    label: "apps/api",
    status: "ok",
    driver: runtimeDriver,
    detail: "API process is running.",
  };
}

export async function probePostgresHealth(
  runtimeDriver: "memory" | "postgres",
  pingPostgres: () => Promise<void>,
): Promise<HealthServiceCheck> {
  if (runtimeDriver !== "postgres") {
    return {
      id: "postgres",
      label: "PostgreSQL",
      status: "skipped",
      driver: "memory",
      detail: "Memory runtime does not use PostgreSQL.",
    };
  }

  try {
    await pingPostgres();
    return {
      id: "postgres",
      label: "PostgreSQL",
      status: "ok",
      driver: "postgres",
      detail: "PostgreSQL reachable.",
    };
  } catch (error) {
    return {
      id: "postgres",
      label: "PostgreSQL",
      status: "error",
      driver: "postgres",
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function probeRedisHealth(
  isRedisQueueEnabled: boolean,
  pingRedis: () => Promise<string>,
): Promise<HealthServiceCheck> {
  if (!isRedisQueueEnabled) {
    return {
      id: "redis",
      label: "Redis",
      status: "skipped",
      driver: "inline",
      detail: "Inline queue does not use Redis.",
    };
  }

  try {
    const pong = await pingRedis();
    if (pong === "PONG") {
      return {
        id: "redis",
        label: "Redis",
        status: "ok",
        driver: "redis",
        detail: "Redis reachable.",
      };
    }

    return {
      id: "redis",
      label: "Redis",
      status: "error",
      driver: "redis",
      detail: `Unexpected ping response: ${pong}`,
    };
  } catch (error) {
    return {
      id: "redis",
      label: "Redis",
      status: "error",
      driver: "redis",
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

export function probeQdrantHealth(health: VectorStoreHealthProbe): HealthServiceCheck {
  return {
    id: "qdrant",
    label: "Qdrant",
    status: health.status === "ok" ? "ok" : "error",
    driver: health.driver,
    detail: health.detail ?? (health.status === "ok" ? "Vector store is reachable." : "Vector store is unavailable."),
  };
}

export function probeEmbeddingHealth(health: EmbeddingProviderHealth): HealthServiceCheck {
  return {
    id: "embedding",
    label: "Embedding Provider",
    status: health.status === "ok" ? "ok" : "error",
    driver: health.driver,
    detail: health.detail,
  };
}

export function probeMinioHealth(health: DocumentStorageHealth): HealthServiceCheck {
  return {
    id: "minio",
    label: "MinIO / Object Storage",
    status: health.status,
    driver: health.driver,
    detail: health.detail,
  };
}

export function toLegacyHealthChecks(services: HealthServiceCheck[]): LegacyHealthChecks {
  const byId = new Map(services.map((service) => [service.id, service]));

  const postgres = byId.get("postgres");
  const redis = byId.get("redis");
  const qdrant = byId.get("qdrant");
  const embedding = byId.get("embedding");
  const minio = byId.get("minio");

  return {
    api: "ok",
    database: {
      status: (postgres?.status ?? "error") as HealthProbeStatus,
      detail: postgres?.detail ?? "PostgreSQL probe missing.",
      driver: postgres?.driver ?? "unknown",
    },
    redis: {
      status: (redis?.status ?? "error") as HealthProbeStatus,
      detail: redis?.detail ?? "Redis probe missing.",
      driver: redis?.driver ?? "unknown",
    },
    vectorStore: {
      status: qdrant?.status === "ok" ? "ok" : "error",
      detail: qdrant?.detail,
      driver: qdrant?.driver === "qdrant" ? "qdrant" : "memory",
    },
    embeddingProvider: {
      status: embedding?.status === "ok" ? "ok" : "error",
      detail: embedding?.detail ?? "Embedding provider probe missing.",
      driver:
        embedding?.driver === "openai-compatible"
          ? "openai-compatible"
          : "simple",
    },
    objectStorage: {
      status: (minio?.status ?? "error") as HealthProbeStatus,
      detail: minio?.detail ?? "Object storage probe missing.",
      driver: minio?.driver === "minio" ? "minio" : "local",
    },
  };
}

export function sortHealthServices(services: HealthServiceCheck[]): HealthServiceCheck[] {
  return [...services].sort(
    (left, right) => SERVICE_ORDER.indexOf(left.id) - SERVICE_ORDER.indexOf(right.id),
  );
}

export function buildHealthSnapshot(input: {
  runtimeDriver: "memory" | "postgres";
  services: HealthServiceCheck[];
  checkedAt?: string;
}): HealthSnapshot {
  const services = sortHealthServices(input.services);

  return {
    status: isHealthDegraded(services) ? "degraded" : "ok",
    driver: input.runtimeDriver,
    checkedAt: input.checkedAt ?? new Date().toISOString(),
    services,
    checks: toLegacyHealthChecks(services),
  };
}

export async function collectHealthSnapshot(
  deps: HealthProbeDependencies,
): Promise<HealthSnapshot> {
  const [postgres, redis, vectorStore, embeddingProvider, objectStorage] = await Promise.all([
    probePostgresHealth(deps.runtimeDriver, deps.pingPostgres),
    probeRedisHealth(deps.isRedisQueueEnabled, deps.pingRedis),
    deps.getVectorStoreHealth().then(probeQdrantHealth),
    deps.getEmbeddingProviderHealth().then(probeEmbeddingHealth),
    deps.getObjectStorageHealth().then(probeMinioHealth),
  ]);

  return buildHealthSnapshot({
    runtimeDriver: deps.runtimeDriver,
    services: [
      buildApiHealthCheck(deps.runtimeDriver),
      postgres,
      redis,
      vectorStore,
      embeddingProvider,
      objectStorage,
    ],
  });
}
