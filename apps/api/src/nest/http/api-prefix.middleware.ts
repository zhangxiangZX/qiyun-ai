import { Injectable, NestMiddleware } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";

export function stripApiV1Prefix(url: string): string {
  if (url.startsWith("/api/v1/")) {
    return url.slice("/api/v1".length) || "/";
  }
  if (url === "/api/v1") {
    return "/";
  }
  return url;
}

@Injectable()
export class ApiPrefixMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    req.url = stripApiV1Prefix(req.url ?? "/");
    next();
  }
}
