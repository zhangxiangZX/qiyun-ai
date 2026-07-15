import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { RuntimeModule } from "../runtime/runtime.module";
import { DocumentsRouteService } from "./documents-route.service";

@Module({
  imports: [RuntimeModule, AuthModule],
  providers: [DocumentsRouteService],
  exports: [DocumentsRouteService],
})
export class DocumentsModule {}
