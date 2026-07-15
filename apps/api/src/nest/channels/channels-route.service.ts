import { Inject, Injectable } from "@nestjs/common";

import type { ApiRuntime } from "../../runtime";
import { matchPath, type ApiResult } from "../../http/api-result";
import { ok } from "../../http/api-envelope";
import { NestAuthContextService } from "../auth/auth-context.service";
import { API_RUNTIME } from "../runtime/runtime.tokens";
import type { ChannelId } from "../../channels/channels.types";

@Injectable()
export class ChannelsRouteService {
  constructor(
    @Inject(API_RUNTIME) private readonly runtime: ApiRuntime,
    @Inject(NestAuthContextService) private readonly authContext: NestAuthContextService,
  ) {}

  async handle(request: Request, pathname: string): Promise<ApiResult | null> {
    const method = request.method;

    if (pathname === "/channels" && method === "GET") {
      const ctx = await this.authContext.resolve(request.headers);
      return ok(await this.runtime.channelsApi.listChannels(ctx));
    }

    const requestMatch = matchPath("/channels/:id/request-access", pathname);
    if (requestMatch && method === "POST") {
      const ctx = await this.authContext.resolve(request.headers);
      const channel = await this.runtime.channelsApi.requestChannelAccess(
        ctx,
        requestMatch.params.id as ChannelId,
      );
      await this.runtime.persist();
      return ok(channel);
    }

    return null;
  }
}
