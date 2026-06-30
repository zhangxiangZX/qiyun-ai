import { getEnvValue, validateEnv } from "../../../../packages/config/src/env";

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
