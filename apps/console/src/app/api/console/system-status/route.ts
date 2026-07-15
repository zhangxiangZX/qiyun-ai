import { NextResponse } from "next/server";

import { getUpstreamApiBaseUrl } from "@/server/api-config";
import { getConsoleDataMode, getConsoleModeMessage } from "@/server/data-mode";
import { fetchUpstreamHealth } from "@/server/upstream-health";

import type { SystemServiceStatus } from "@/lib/system-status/types";
import type { UpstreamHealthService } from "@/server/upstream-health";

const UPSTREAM_SERVICE_LABELS: Record<string, string> = {
  api: "apps/api",
  postgres: "PostgreSQL",
  redis: "Redis",
  qdrant: "Qdrant",
  minio: "MinIO / 文件存储",
  embedding: "Embedding",
};

const PREVIEW_SERVICE_IDS = [
  "api",
  "postgres",
  "redis",
  "qdrant",
  "minio",
  "embedding",
] as const;

function mapProbeStatus(
  status: UpstreamHealthService["status"],
  reachable: boolean,
): SystemServiceStatus["status"] {
  if (!reachable) {
    return "unreachable";
  }
  if (status === "ok") {
    return "healthy";
  }
  if (status === "skipped") {
    return "unknown";
  }
  return "degraded";
}

function mapUnifiedService(
  service: UpstreamHealthService,
  reachable: boolean,
): SystemServiceStatus {
  return {
    id: service.id,
    label: UPSTREAM_SERVICE_LABELS[service.id] ?? service.label,
    status: mapProbeStatus(service.status, reachable),
    detail: service.detail,
  };
}

function buildPreviewServices(): SystemServiceStatus[] {
  return [
    {
      id: "api",
      label: "apps/api",
      status: "preview",
      detail: "未配置 API_BASE_URL，Console 使用内置 BFF 内存模拟。",
    },
    {
      id: "postgres",
      label: "PostgreSQL",
      status: "preview",
      detail: "演示模式不连接真实数据库；业务数据仅存于 Console 进程内存。",
    },
    {
      id: "redis",
      label: "Redis",
      status: "preview",
      detail: "演示模式不连接 Redis 队列；文档解析为 BFF 内模拟。",
    },
    {
      id: "qdrant",
      label: "Qdrant",
      status: "preview",
      detail: "演示模式不写入向量库；引用为模拟数据。",
    },
    {
      id: "minio",
      label: "MinIO / 文件存储",
      status: "preview",
      detail: "演示模式不上传至对象存储；文件不落盘。",
    },
    {
      id: "embedding",
      label: "Embedding",
      status: "preview",
      detail: "演示模式使用本地降级 embedding；未调用远程向量化服务。",
    },
  ];
}

function buildUnreachableServices(): SystemServiceStatus[] {
  const detail = "无法连接上游 /health，请检查 API_BASE_URL、网络与 apps/api 进程。";
  return PREVIEW_SERVICE_IDS.map((id) => ({
    id,
    label: UPSTREAM_SERVICE_LABELS[id] ?? id,
    status: "unreachable" as const,
    detail,
  }));
}

function buildUnreadableServices(): SystemServiceStatus[] {
  const detail =
    "统一 /health 探测结果不完整：上游可达，但未返回 services[]。此为降级展示，不是旧版兼容模式。";
  return PREVIEW_SERVICE_IDS.map((id) => ({
    id,
    label: UPSTREAM_SERVICE_LABELS[id] ?? id,
    status: "degraded" as const,
    detail,
  }));
}

function buildServices(input: {
  mode: "preview" | "upstream";
  reachable: boolean;
  unifiedServices?: UpstreamHealthService[];
}): SystemServiceStatus[] {
  const { mode, reachable, unifiedServices } = input;

  if (mode === "preview") {
    return buildPreviewServices();
  }

  if (!reachable) {
    return buildUnreachableServices();
  }

  if (unifiedServices && unifiedServices.length > 0) {
    return unifiedServices.map((service) => mapUnifiedService(service, true));
  }

  return buildUnreadableServices();
}

export async function GET() {
  const upstreamConfigured = Boolean(getUpstreamApiBaseUrl());
  const mode = getConsoleDataMode();
  const health = upstreamConfigured ? await fetchUpstreamHealth() : null;

  const services = buildServices({
    mode,
    reachable: health?.reachable ?? false,
    unifiedServices: health?.services,
  });

  const healthFormat = mode === "preview" ? "preview" : "unified";

  const healthServicesComplete =
    mode === "preview" || Boolean(health?.reachable && health?.services && health.services.length > 0);

  return NextResponse.json({
    mode,
    upstreamConfigured,
    modeMessage: getConsoleModeMessage(),
    upstreamReachable: health?.reachable,
    apiDriver: health?.apiDriver,
    upstreamCheckedAt: health?.checkedAt,
    healthFormat,
    healthServicesComplete,
    services,
    workspaceNote:
      "工作区上下文由登录 Session 与 POST /workspaces/:id/activate 维护；本页不执行切换操作。",
    checkedAt: new Date().toISOString(),
  });
}
