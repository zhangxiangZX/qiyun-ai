export type EnvSchema = Record<string, string>;

export const requiredEnvKeys = [
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

export type RequiredEnvKey = (typeof requiredEnvKeys)[number];

export function validateEnv(env: EnvSchema): EnvSchema {
  const missingKeys = requiredEnvKeys.filter((key) => {
    const value = env[key];
    return value === undefined || value === "";
  });

  if (missingKeys.length > 0) {
    throw new Error(`Missing required environment variables: ${missingKeys.join(", ")}`);
  }

  return env;
}

export function getEnvValue(env: EnvSchema, key: RequiredEnvKey): string {
  const value = env[key];
  if (value === undefined || value === "") {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}
