import { readFile } from "node:fs/promises";
import path from "node:path";
import { URL } from "node:url";

import { toAuthHttpError } from "../auth/auth.api";
import { toChatHttpError } from "../chat/chat.api";
import { toHttpError } from "../documents/document.api";
import { json, type ApiResult } from "./api-result";
import { buildRateLimitMessage, checkNamedRateLimit } from "./rate-limit";
import { createRequestId, getClientIp } from "./request-context";

async function getNestHealthService() {
  const { getNestHealthService: resolve } = await import("../nest/bootstrap.js");
  return resolve();
}

async function getNestRouteDispatcher() {
  const { getNestRouteDispatcher: resolve } = await import("../nest/bootstrap.js");
  return resolve();
}

function normalizePath(pathname: string): string {
  if (pathname.startsWith("/api/v1/")) {
    return pathname.slice("/api/v1".length);
  }
  if (pathname === "/api/v1") {
    return "/";
  }
  return pathname;
}

function attachPublicCors(
  request: Request,
  pathname: string,
  result: ApiResult,
): ApiResult {
  if (!pathname.startsWith("/public/")) {
    return result;
  }

  const origin = request.headers.get("origin") ?? "*";
  return {
    ...result,
    headers: {
      ...result.headers,
      "access-control-allow-origin": origin,
      "access-control-allow-methods": "GET, POST, OPTIONS",
      "access-control-allow-headers": "content-type",
    },
  };
}

async function loadWidgetScript(): Promise<string> {
  const candidates = [
    path.join(process.cwd(), "dist", "assets", "widget.js"),
    path.join(process.cwd(), "assets", "widget.js"),
    path.join(process.cwd(), "apps", "api", "dist", "assets", "widget.js"),
    path.join(process.cwd(), "apps", "api", "assets", "widget.js"),
  ];

  for (const candidate of candidates) {
    try {
      return await readFile(candidate, "utf8");
    } catch {
      // try next path
    }
  }

  throw new Error("Widget asset not found.");
}

async function loadWidgetVersion(): Promise<string> {
  const candidates = [
    path.join(process.cwd(), "dist", "assets", "widget-version.txt"),
    path.join(process.cwd(), "assets", "widget-version.txt"),
    path.join(process.cwd(), "apps", "api", "dist", "assets", "widget-version.txt"),
    path.join(process.cwd(), "apps", "api", "assets", "widget-version.txt"),
  ];

  for (const candidate of candidates) {
    try {
      return (await readFile(candidate, "utf8")).trim();
    } catch {
      // try next path
    }
  }

  return "dev";
}

let widgetScriptCache: string | null = null;

async function getWidgetScript(): Promise<string> {
  if (process.env.NODE_ENV === "production" && widgetScriptCache) {
    return widgetScriptCache;
  }
  const script = await loadWidgetScript();
  widgetScriptCache = script;
  return script;
}

function asErrorResult(error: unknown, requestId?: string): ApiResult {
  const authMapped = toAuthHttpError(error);
  if (authMapped.code !== "INTERNAL_ERROR") {
    return json(
      authMapped.statusCode,
      {
        code: authMapped.code,
        message: authMapped.message,
      },
      requestId,
    );
  }

  const mapped = toHttpError(error);
  if (mapped.code === "INTERNAL_ERROR") {
    const chatMapped = toChatHttpError(error);
    if (chatMapped.code !== "INTERNAL_ERROR" || chatMapped.message !== "Unexpected error.") {
      return json(
        chatMapped.statusCode,
        {
          code: chatMapped.code,
          message: chatMapped.message,
        },
        requestId,
      );
    }
  }

  return json(
    mapped.statusCode,
    { code: mapped.code, message: mapped.message },
    requestId,
  );
}

function finalizeResult(
  result: ApiResult,
  request?: Request,
  pathname?: string,
): Response {
  const output =
    request && pathname ? attachPublicCors(request, pathname, result) : result;

  if (output.stream) {
    const headers = new Headers(output.headers);
    if (output.requestId) {
      headers.set("x-request-id", output.requestId);
    }
    return new Response(output.stream, {
      status: output.status,
      headers,
    });
  }

  if (output.text !== undefined) {
    const headers = new Headers(output.headers);
    if (output.requestId) {
      headers.set("x-request-id", output.requestId);
    }
    return new Response(output.text, {
      status: output.status,
      headers,
    });
  }

  if (output.bytes !== undefined) {
    const headers = new Headers(output.headers);
    if (output.requestId) {
      headers.set("x-request-id", output.requestId);
    }
    return new Response(output.bytes, {
      status: output.status,
      headers,
    });
  }

  if (output.body === undefined) {
    const headers = new Headers(output.headers);
    if (output.requestId) {
      headers.set("x-request-id", output.requestId);
    }
    return new Response(null, { status: output.status, headers });
  }

  const headers = new Headers(output.headers);
  if (output.requestId) {
    headers.set("x-request-id", output.requestId);
  }
  return Response.json(output.body, {
    status: output.status,
    headers,
  });
}

export async function handleApiRequest(request: Request): Promise<Response> {
  const requestId = createRequestId();
  const url = new URL(request.url);
  const pathname = normalizePath(url.pathname);

  try {
    if (pathname.startsWith("/public/") && request.method === "OPTIONS") {
      return finalizeResult(
        attachPublicCors(request, pathname, { status: 204 }),
        request,
        pathname,
      );
    }

    if (
      pathname !== "/health"
      && pathname !== "/"
      && pathname !== "/public/widget.js"
    ) {
      const globalRate = checkNamedRateLimit("api.global.ip", getClientIp(request));
      if (!globalRate.allowed) {
        return finalizeResult(
          json(429, {
            code: "RATE_LIMITED",
            message: buildRateLimitMessage("api.global.ip", globalRate.retryAfterSec),
            retryAfterSec: globalRate.retryAfterSec,
            requestId,
          }),
          request,
          pathname,
        );
      }
    }

    if (pathname === "/health" && request.method === "GET") {
      const health = await (await getNestHealthService()).collect();
      return finalizeResult(
        json(health.status === "ok" ? 200 : 503, health),
        request,
        pathname,
      );
    }

    if (pathname === "/public/widget.js" && request.method === "GET") {
      const script = await getWidgetScript();
      return finalizeResult(
        {
          status: 200,
          headers: {
            "content-type": "application/javascript; charset=utf-8",
            "cache-control": "public, max-age=300",
          },
          text: script,
        },
        request,
        pathname,
      );
    }

    if (pathname === "/public/widget-version.txt" && request.method === "GET") {
      const version = await loadWidgetVersion();
      return finalizeResult(
        {
          status: 200,
          headers: {
            "content-type": "text/plain; charset=utf-8",
            "cache-control": "public, max-age=60",
          },
          text: `${version}\n`,
        },
        request,
        pathname,
      );
    }

    if (pathname === "/" && request.method === "GET") {
      return finalizeResult(
        json(200, {
          name: "qiyun-api",
          status: "ok",
        }),
        request,
        pathname,
      );
    }

    const nestResult = await (await getNestRouteDispatcher()).dispatch(
      request,
      pathname,
      requestId,
    );
    if (nestResult) {
      return finalizeResult(nestResult, request, pathname);
    }

    return Response.json(
      {
        code: "NOT_FOUND",
        message: "Route not found.",
        requestId,
      },
      { status: 404, headers: { "x-request-id": requestId } },
    );
  } catch (error) {
    const mapped = asErrorResult(error, requestId);
    return finalizeResult(mapped, request, pathname);
  }
}
