import { Inject, Injectable } from "@nestjs/common";

import type { ApiRuntime } from "../../runtime";
import { json, type ApiResult } from "../../http/api-result";
import { NestAuthContextService } from "../auth/auth-context.service";
import { API_RUNTIME } from "../runtime/runtime.tokens";

@Injectable()
export class GeoRouteService {
  constructor(
    @Inject(API_RUNTIME) private readonly runtime: ApiRuntime,
    @Inject(NestAuthContextService)
    private readonly authContext: NestAuthContextService,
  ) {}

  async handle(request: Request, pathname: string, requestId?: string): Promise<ApiResult | null> {
    if (pathname === "/geo/distribution" && request.method === "GET") {
      await this.authContext.resolve(request.headers);
      return json(200, this.runtime.geoApi.getDistribution(), requestId);
    }

    return null;
  }
}
