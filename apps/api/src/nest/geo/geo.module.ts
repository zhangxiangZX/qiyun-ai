import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { RuntimeModule } from "../runtime/runtime.module";
import { GeoRouteService } from "./geo-route.service";

@Module({
  imports: [RuntimeModule, AuthModule],
  providers: [GeoRouteService],
  exports: [GeoRouteService],
})
export class GeoModule {}
