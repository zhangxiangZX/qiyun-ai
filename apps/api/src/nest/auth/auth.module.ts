import { Module } from "@nestjs/common";

import { RuntimeModule } from "../runtime/runtime.module";
import { AuthRouteService } from "./auth-route.service";
import { PlatformRouteService } from "./platform-route.service";
import { NestAuthContextService } from "./auth-context.service";
import { BearerAuthGuard } from "./guards/bearer-auth.guard";
import { WorkspaceAuthGuard } from "./guards/workspace-auth.guard";
import { WorkspaceRouteService } from "./workspace-route.service";

@Module({
  imports: [RuntimeModule],
  providers: [
    BearerAuthGuard,
    WorkspaceAuthGuard,
    NestAuthContextService,
    AuthRouteService,
    PlatformRouteService,
    WorkspaceRouteService,
  ],
  exports: [
    BearerAuthGuard,
    WorkspaceAuthGuard,
    NestAuthContextService,
    AuthRouteService,
    PlatformRouteService,
    WorkspaceRouteService,
  ],
})
export class AuthModule {}
