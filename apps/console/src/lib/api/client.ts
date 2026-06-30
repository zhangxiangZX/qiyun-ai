import { ApiError, type ApiErrorCode } from "@/lib/api/errors";
import { WORKSPACE_ID } from "@/lib/api/workspace";

const API_PREFIX =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "/api";

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
};

async function parseError(response: Response): Promise<ApiError> {
  let code: ApiErrorCode = "INTERNAL_ERROR";
  let message = `Request failed with status ${response.status}.`;

  try {
    const payload = (await response.json()) as { code?: ApiErrorCode; message?: string };
    if (payload.code) code = payload.code;
    if (payload.message) message = payload.message;
  } catch {
    // Keep default message when the body is not JSON.
  }

  return new ApiError(response.status, code, message);
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(`${API_PREFIX}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "content-type": "application/json",
      "x-workspace-id": WORKSPACE_ID,
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    cache: "no-store",
  });

  if (!response.ok) {
    throw await parseError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
