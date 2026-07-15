import { Module } from "@nestjs/common";

import { ApiHttpController } from "./api-http.controller";

@Module({
  controllers: [ApiHttpController],
})
export class HttpModule {}
