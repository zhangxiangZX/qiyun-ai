import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { RuntimeModule } from "../runtime/runtime.module";
import { SalesRouteService } from "./sales-route.service";

@Module({
  imports: [RuntimeModule, AuthModule],
  providers: [SalesRouteService],
  exports: [SalesRouteService],
})
export class SalesModule {}
