import { Controller, Get, HttpStatus, Res } from "@nestjs/common";
import type { Response } from "express";

import { NestHealthService } from "./health.service";

@Controller()
export class HealthController {
  constructor(private readonly healthService: NestHealthService) {}

  @Get("health")
  async getHealth(@Res() response: Response) {
    const snapshot = await this.healthService.collect();
    response
      .status(snapshot.status === "ok" ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE)
      .json(snapshot);
  }
}
