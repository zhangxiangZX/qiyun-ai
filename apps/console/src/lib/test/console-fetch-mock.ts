export type FetchHandler = (url: string, init?: RequestInit) => Response | Promise<Response>;

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export async function withFetchMock(
  handler: FetchHandler,
  run: () => void | Promise<void>,
): Promise<void> {
  const original = global.fetch;
  global.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    return handler(String(input), init);
  }) as typeof fetch;

  try {
    await run();
  } finally {
    global.fetch = original;
  }
}

export const previewModeInfo = {
  mode: "preview" as const,
  upstreamConfigured: false,
  message: "Preview mode.",
};

export const upstreamModeInfo = {
  mode: "upstream" as const,
  upstreamConfigured: true,
  message: "Upstream mode.",
};

export function modeHandler(mode: typeof previewModeInfo | typeof upstreamModeInfo): FetchHandler {
  return (url) => {
    if (url.includes("/api/console/mode") || url.endsWith("/console/mode")) {
      return jsonResponse(mode);
    }
    return jsonResponse({ code: "NOT_FOUND", message: "Unhandled test URL." }, 404);
  };
}
