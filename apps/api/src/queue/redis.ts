import { createClient } from "redis";

type AppRedisClient = ReturnType<typeof createClient>;

let clientPromise: Promise<AppRedisClient> | undefined;
let clientOverrideFactory: (() => Promise<AppRedisClient>) | undefined;

export function getRedisClient(): Promise<AppRedisClient> {
  if (clientOverrideFactory) {
    return clientOverrideFactory();
  }

  if (!clientPromise) {
    const client = createClient({
      url: process.env.REDIS_URL,
    });
    clientPromise = client.connect().then(() => client);
  }

  return clientPromise;
}

export function setRedisClientFactoryForTests(
  factory: (() => Promise<AppRedisClient>) | undefined,
): void {
  clientOverrideFactory = factory;
}

export async function closeRedisClient(): Promise<void> {
  if (!clientPromise) {
    return;
  }

  const client = await clientPromise;
  await client.quit();
  clientPromise = undefined;
}
