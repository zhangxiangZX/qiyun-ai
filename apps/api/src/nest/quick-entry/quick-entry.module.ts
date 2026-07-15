import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { RuntimeModule } from "../runtime/runtime.module";
import { QuickEntryRouteService } from "./quick-entry-route.service";
@Module({ imports: [RuntimeModule, AuthModule], providers: [QuickEntryRouteService], exports: [QuickEntryRouteService] })
export class QuickEntryModule {}
