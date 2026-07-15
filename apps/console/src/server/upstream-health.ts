import { getUpstreamApiBaseUrl } from "@/server/api-config";

export interface UpstreamHealthCheck {
  status: "ok" | "skipped" | "error";
  detail: string;
  driver?: string;
}

export interface UpstreamHealthService {
  id: string;
  label: string;
  status: "ok" | "skipped" | "error";
  driver: string;
  detail: string;
}

export interface UpstreamHealthSnapshot {
  apiDriver?: string;
  overallStatus?: "ok" | "degraded";
  reachable: boolean;
  checkedAt?: string;
  services?: UpstreamHealthService[];
  checks?: {
    database?: UpstreamHealthCheck;
    redis?: UpstreamHealthCheck;
    vectorStore?: UpstreamHealthCheck;
    embeddingProvider?: UpstreamHealthCheck;
    objectStorage?: UpstreamHealthCheck;
  };
}

export async function fetchUpstreamHealth(): Promise<UpstreamHealthSnapshot | null> {
  const baseUrl = getUpstreamApiBaseUrl();
  if (!baseUrl) {
    return null;
  }

  try {
    const response = await fetch(`${baseUrl}/health`, {
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    });

    if (!response.ok) {
      return { reachable: false };
    }

    const payload = (await response.json()) as {
      driver?: string;
      status?: "ok" | "degraded";
      checkedAt?: string;
      services?: UpstreamHealthService[];
      checks?: UpstreamHealthSnapshot["checks"];
    };
    return {
      reachable: true,
      apiDriver: payload.driver,
      overallStatus: payload.status,
      checkedAt: payload.checkedAt,
      services: payload.services,
      checks: payload.checks,
    };
  } catch {
    return { reachable: false };
  }
}
