export interface RouteMatch {
  params: Record<string, string>;
}

export interface ApiResult {
  status: number;
  headers?: Record<string, string>;
  bytes?: Uint8Array;
  body?: unknown;
  text?: string;
  stream?: ReadableStream<Uint8Array>;
  requestId?: string;
}

export function matchPath(pattern: string, pathname: string): RouteMatch | null {
  const patternParts = pattern.split("/").filter(Boolean);
  const pathParts = pathname.split("/").filter(Boolean);

  if (patternParts.length !== pathParts.length) {
    return null;
  }

  const params: Record<string, string> = {};

  for (let index = 0; index < patternParts.length; index += 1) {
    const patternPart = patternParts[index];
    const pathPart = pathParts[index];

    if (!patternPart || !pathPart) {
      return null;
    }

    if (patternPart.startsWith(":")) {
      params[patternPart.slice(1)] = decodeURIComponent(pathPart);
      continue;
    }

    if (patternPart !== pathPart) {
      return null;
    }
  }

  return { params };
}

export function json(status: number, body: unknown, requestId?: string): ApiResult {
  const payload =
    body && typeof body === "object" && !Array.isArray(body)
      ? { ...(body as Record<string, unknown>), ...(requestId ? { requestId } : {}) }
      : body;

  return {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...(requestId ? { "x-request-id": requestId } : {}),
    },
    body: payload,
    requestId,
  };
}

export function stream(
  status: number,
  body: ReadableStream<Uint8Array>,
  contentType: string,
): ApiResult {
  return {
    status,
    headers: {
      "content-type": contentType,
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
    },
    stream: body,
  };
}
