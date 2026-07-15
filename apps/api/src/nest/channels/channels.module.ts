import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { RuntimeModule } from "../runtime/runtime.module";
import { ChannelsRouteService } from "./channels-route.service";

@Module({
  imports: [RuntimeModule, AuthModule],
  providers: [ChannelsRouteService],
  exports: [ChannelsRouteService],
})
export class ChannelsModule {}
