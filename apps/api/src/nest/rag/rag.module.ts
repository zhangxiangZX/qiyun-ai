import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { RuntimeModule } from "../runtime/runtime.module";
import { RagRouteService } from "./rag-route.service";

@Module({
  imports: [RuntimeModule, AuthModule],
  providers: [RagRouteService],
  exports: [RagRouteService],
})
export class RagModule {}
