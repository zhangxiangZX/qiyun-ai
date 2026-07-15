import { Module } from "@nestjs/common";

import { RuntimeModule } from "../runtime/runtime.module";
import { NestHealthService } from "./health.service";

@Module({
  imports: [RuntimeModule],
  providers: [NestHealthService],
  exports: [NestHealthService],
})
export class HealthModule {}
