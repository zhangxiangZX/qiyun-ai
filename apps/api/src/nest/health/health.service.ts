import { Inject, Injectable } from "@nestjs/common";

import type { HealthSnapshot } from "../../health/health.types";
import type { ApiRuntime } from "../../runtime";
import { API_RUNTIME } from "../runtime/runtime.tokens";

@Injectable()
export class NestHealthService {
  constructor(
    @Inject(API_RUNTIME) private readonly runtime: ApiRuntime,
  ) {}

  collect(): Promise<HealthSnapshot> {
    return this.runtime.healthCheck();
  }
}
