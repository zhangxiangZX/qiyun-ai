export type HealthServiceId = "api" | "postgres" | "redis" | "qdrant" | "embedding" | "minio";

export type HealthProbeStatus = "ok" | "skipped" | "error";

export interface HealthServiceCheck {
  id: HealthServiceId;
  label: string;
  status: HealthProbeStatus;
  driver: string;
  detail: string;
}

export interface LegacyHealthChecks {
  api: "ok";
  database: {
    status: HealthProbeStatus;
    detail: string;
    driver: string;
  };
  redis: {
    status: HealthProbeStatus;
    detail: string;
    driver: string;
  };
  vectorStore: {
    status: "ok" | "error";
    detail?: string;
    driver: "memory" | "qdrant";
  };
  embeddingProvider: {
    status: "ok" | "error";
    detail: string;
    driver: "simple" | "openai-compatible";
  };
  objectStorage: {
    status: HealthProbeStatus;
    detail: string;
    driver: "local" | "minio";
  };
}

export interface HealthSnapshot {
  status: "ok" | "degraded";
  driver: "memory" | "postgres";
  checkedAt: string;
  services: HealthServiceCheck[];
  checks: LegacyHealthChecks;
}
