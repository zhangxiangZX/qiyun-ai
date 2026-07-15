import { ApiError, normalizeApiErrorCode, type ApiErrorCode } from "@/lib/api/errors";
import { unwrapEnvelope } from "@/lib/api/envelope";
import { WORKSPACE_ID } from "@/lib/api/workspace";

// Browser requests must go through the Console BFF (/api) so cookies, session,
// and workspace proxy headers stay on the same-origin path.
export function getApiPrefix(): string {
  if (typeof window !== "undefined") {
    return "/api";
  }

  return process.env.API_BASE_URL?.replace(/\/$/, "") || "/api";
}

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
};

async function parseJsonBody<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    // 非 JSON（如二进制流）交由调用方另行处理，这里不强行解包。
    return undefined as T;
  }
  const body = (await response.json().catch(() => null)) as unknown;
  return unwrapEnvelope<T>(body);
}

async function parseError(response: Response): Promise<ApiError> {
  let code: ApiErrorCode = "INTERNAL_ERROR";
  let message = `Request failed with status ${response.status}.`;

  try {
    const payload = (await response.json()) as { code?: string; message?: string };
    code = normalizeApiErrorCode(response.status, payload.code);
    if (payload.message) message = payload.message;
  } catch {
    // Keep default message when the body is not JSON.
  }

  return new ApiError(response.status, code, message);
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(`${getApiPrefix()}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "content-type": "application/json",
      "x-workspace-id": WORKSPACE_ID,
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    cache: "no-store",
    credentials: "include",
  });

  if (!response.ok) {
    throw await parseError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return parseJsonBody<T>(response);
}

export async function apiFormDataRequest<T>(path: string, formData: FormData): Promise<T> {
  const response = await fetch(`${getApiPrefix()}${path}`, {
    method: "POST",
    headers: {
      "x-workspace-id": WORKSPACE_ID,
    },
    body: formData,
    cache: "no-store",
    credentials: "include",
  });

  if (!response.ok) {
    throw await parseError(response);
  }

  return parseJsonBody<T>(response);
}
