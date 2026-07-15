import { MiddlewareConsumer, Module, NestModule, RequestMethod } from "@nestjs/common";

import { AuthModule } from "./auth/auth.module";
import { HealthModule } from "./health/health.module";
import { ApiPrefixMiddleware } from "./http/api-prefix.middleware";
import { HttpModule } from "./http/http.module";
import { RoutingModule } from "./routing/routing.module";
import { RuntimeModule } from "./runtime/runtime.module";

@Module({
  imports: [RuntimeModule, AuthModule, HealthModule, RoutingModule, HttpModule],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(ApiPrefixMiddleware).forRoutes({
      path: "*",
      method: RequestMethod.ALL,
    });
  }
}
