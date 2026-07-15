import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { RuntimeModule } from "../runtime/runtime.module";
import { AuditRouteService } from "./audit-route.service";

@Module({
  imports: [RuntimeModule, AuthModule],
  providers: [AuditRouteService],
  exports: [AuditRouteService],
})
export class AuditModule {}
