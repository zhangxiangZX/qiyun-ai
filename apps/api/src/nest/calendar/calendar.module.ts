import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { RuntimeModule } from "../runtime/runtime.module";
import { CalendarRouteService } from "./calendar-route.service";

@Module({
  imports: [RuntimeModule, AuthModule],
  providers: [CalendarRouteService],
  exports: [CalendarRouteService],
})
export class CalendarModule {}
