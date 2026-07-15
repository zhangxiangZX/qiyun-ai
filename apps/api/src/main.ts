import { loadApiEnv, getApiPort } from "./config/env";
import { loadRootEnvFile } from "./load-env";
import { createApiServer } from "./app";
import { getRuntime } from "./runtime";
import { createLogger } from "./logging/logger";

export const appName = "qiyun-api";

const appLogger = createLogger();

export function bootstrapApi(): string {
  return `${appName} runtime is ready`;
}

async function main(): Promise<void> {
  if (process.env.NODE_ENV !== "test") {
    loadRootEnvFile();
  }
  loadApiEnv();
  await getRuntime();
  const port = getApiPort();
  const server = createApiServer();
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, () => resolve());
  });

  process.stdout.write(`${appName} listening on http://localhost:${port}\n`);
  appLogger.info("server listening", { port });
}

if (require.main === module) {
  void main().catch((error) => {
    process.stderr.write(`${String(error)}\n`);
    process.exitCode = 1;
  });
}
