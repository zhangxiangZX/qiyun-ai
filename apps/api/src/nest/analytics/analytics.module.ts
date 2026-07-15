import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { RuntimeModule } from "../runtime/runtime.module";
import { AnalyticsRouteService } from "./analytics-route.service";

@Module({
  imports: [RuntimeModule, AuthModule],
  providers: [AnalyticsRouteService],
  exports: [AnalyticsRouteService],
})
export class AnalyticsModule {}
