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

type RequiredEnvKey = (typeof requiredEnvKeys)[number];

function validateEnv(env: Record<string, string>): Record<string, string> {
  const missingKeys = requiredEnvKeys.filter((key) => {
    const value = env[key];
    return value === undefined || value === "";
  });

  if (missingKeys.length > 0) {
    throw new Error(`Missing required environment variables: ${missingKeys.join(", ")}`);
  }

  return env;
}

function getEnvValue(env: Record<string, string>, key: RequiredEnvKey): string {
  const value = env[key];

  if (value === undefined || value === "") {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
}

export function loadApiEnv(env: Record<string, string | undefined> = process.env): Record<string, string> {
  const normalizedEnv: Record<string, string> = {};

  for (const [key, value] of Object.entries(env)) {
    if (value !== undefined) {
      normalizedEnv[key] = value;
    }
  }

  return validateEnv(normalizedEnv);
}

export function getApiPort(env: Record<string, string> = process.env as Record<string, string>): number {
  return Number.parseInt(getEnvValue(env, "API_PORT"), 10);
}
