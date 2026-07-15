import "reflect-metadata";

import { NestFactory } from "@nestjs/core";
import type { INestApplication, INestApplicationContext } from "@nestjs/common";

import { AppModule } from "./app.module";
import { NestAuthContextService } from "./auth/auth-context.service";
import { NestHealthService } from "./health/health.service";
import { NestRouteDispatcher } from "./routing/nest-route.dispatcher";

let nestApplication: INestApplication | null = null;
let nestApplicationPromise: Promise<INestApplication> | null = null;

async function buildNestApplication(): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule, {
    logger: false,
    bodyParser: true,
  });
  await app.init();
  return app;
}

export async function getNestApplication(): Promise<INestApplication> {
  if (!nestApplicationPromise) {
    nestApplicationPromise = buildNestApplication().then((app) => {
      nestApplication = app;
      return app;
    });
  }

  return nestApplicationPromise;
}

export async function getNestApplicationContext(): Promise<INestApplicationContext> {
  return getNestApplication();
}

export async function createNestHttpApplication(): Promise<INestApplication> {
  return getNestApplication();
}

export async function getNestHealthService(): Promise<NestHealthService> {
  const context = await getNestApplicationContext();
  return context.get(NestHealthService);
}

export async function getNestAuthContextService(): Promise<NestAuthContextService> {
  const context = await getNestApplicationContext();
  return context.get(NestAuthContextService);
}

export async function getNestRouteDispatcher(): Promise<NestRouteDispatcher> {
  const context = await getNestApplicationContext();
  return context.get(NestRouteDispatcher);
}

export async function resetNestContextForTests(): Promise<void> {
  const closing = nestApplication;
  nestApplication = null;
  nestApplicationPromise = null;
  if (closing) {
    await closing.close();
  }
}
