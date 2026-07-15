import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { RuntimeModule } from "../runtime/runtime.module";
import { SalesLinksRouteService } from "./sales-links-route.service";

@Module({
  imports: [RuntimeModule, AuthModule],
  providers: [SalesLinksRouteService],
  exports: [SalesLinksRouteService],
})
export class SalesLinksModule {}
