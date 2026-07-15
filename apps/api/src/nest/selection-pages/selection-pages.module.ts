import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { RuntimeModule } from "../runtime/runtime.module";
import { SelectionPagesRouteService } from "./selection-pages-route.service";

@Module({
  imports: [RuntimeModule, AuthModule],
  providers: [SelectionPagesRouteService],
  exports: [SelectionPagesRouteService],
})
export class SelectionPagesModule {}
