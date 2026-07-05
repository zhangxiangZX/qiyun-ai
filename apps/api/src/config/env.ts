const requiredEnvKeys = [
  "NODE_ENV",
  "APP_NAME",
  "APP_URL",
  "API_PORT",
  "DATABASE_URL",
  "REDIS_URL",
  "MINIO_ENDPOINT",
  "MINIO_ACCESS_KEY",
  "MINIO_SECRET_KEY",
  "MINIO_BUCKET",
  "QDRANT_URL",
  "JWT_SECRET",
  "JWT_REFRESH_SECRET",
  "LLM_PROVIDER",
  "LLM_BASE_URL",
  "LLM_API_KEY",
  "LLM_CHAT_MODEL",
  "LLM_EMBEDDING_MODEL",
  "WORKER_CONCURRENCY",
  "CORS_ORIGIN",
] as const;

export type ApiEnv = Record<string, string>;

export function loadApiEnv(
  input: Record<string, string | undefined> = process.env,
): ApiEnv {
  const env: ApiEnv = {};

  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined && value !== "") {
      env[key] = value;
    }
  }

  const missing = requiredEnvKeys.filter((key) => !env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`,
    );
  }

  return env;
}

export function getApiPort(
  env: Record<string, string> = process.env as Record<string, string>,
): number {
  return Number.parseInt(env.API_PORT ?? "3001", 10);
}

export function getApiRuntimeDriver(
  env: Record<string, string> = process.env as Record<string, string>,
): "memory" | "postgres" {
  return env.API_RUNTIME_DRIVER === "postgres" ? "postgres" : "memory";
}

export function getDocumentStorageDriver(
  env: Record<string, string> = process.env as Record<string, string>,
): "local" | "minio" {
  const raw = env.DOCUMENT_STORAGE_DRIVER?.trim().toLowerCase();
  if (raw === "local") return "local";
  if (raw === "minio") return "minio";
  return env.NODE_ENV === "test" ? "local" : "minio";
}
