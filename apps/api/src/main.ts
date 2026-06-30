import { getApiPort, loadApiEnv } from "./config/env";

export const appName = "qiyun-api";

export function bootstrapApi(env: Record<string, string | undefined> = process.env): {
  appName: string;
  port: number;
} {
  const loadedEnv = loadApiEnv(env);

  return {
    appName,
    port: getApiPort(loadedEnv),
  };
}
