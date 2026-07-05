import { Inject, Injectable } from "@nestjs/common";

import { getBearerToken } from "../../../auth/auth.context";
import { AuthAccessError } from "../../../auth/auth.api";
import type { AuthUserPayload } from "../../../auth/auth.types";
import type { ApiRuntime } from "../../../runtime";
import { API_RUNTIME } from "../../runtime/runtime.tokens";

@Injectable()
export class BearerAuthGuard {
  constructor(
    @Inject(API_RUNTIME) private readonly runtime: ApiRuntime,
  ) {}

  async assertBearerToken(headers: Headers): Promise<AuthUserPayload> {
    const token = getBearerToken(headers);
    if (!token) {
      throw new AuthAccessError("Missing bearer token.");
    }

    return this.runtime.authApi.authenticate(token);
  }
}
