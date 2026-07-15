import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { RuntimeModule } from "../runtime/runtime.module";
import { ChatRouteService } from "./chat-route.service";

@Module({
  imports: [RuntimeModule, AuthModule],
  providers: [ChatRouteService],
  exports: [ChatRouteService],
})
export class ChatModule {}
