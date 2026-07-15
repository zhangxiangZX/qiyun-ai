import type { HealthFormat, ServiceProbeStatus, SystemServiceStatus, SystemStatusSnapshot } from "./types";

export interface ServiceAbnormalHint {
  title: string;
  message: string;
  action?: string;
}

export interface ServiceInfoNote {
  title: string;
  message: string;
}

export function resolveIncompleteHealthNotice(
  snapshot: Pick<
    SystemStatusSnapshot,
    "mode" | "upstreamReachable" | "healthServicesComplete"
  >,
): string | null {
  if (
    snapshot.mode === "upstream" &&
    snapshot.upstreamReachable === true &&
    snapshot.healthServicesComplete === false
  ) {
    return "健康检查可达但未返回完整服务列表，下方依赖项为降级展示。";
  }
  return null;
}

export function resolveApiDriverLabel(driver: string | undefined): string {
  switch (driver) {
    case "postgres":
      return "生产数据库（PostgreSQL）";
    case "memory":
      return "演示存储（重启后数据不保留）";
    default:
      return driver ? `存储驱动：${driver}` : "通过健康检查探测";
  }
}

export function resolveHealthFormatDescription(format: HealthFormat | undefined): string {
  switch (format) {
    case "unified":
      return "状态来自后端统一健康检查，包含数据库、缓存、向量库、文件存储与向量化服务等项。";
    case "preview":
      return "演示模式不连接真实基础设施，下方为能力说明占位，不代表生产连通性。";
    default:
      return "无法读取运行模式，以下状态仅供参考。";
  }
}

export function resolveServiceInfoNote(service: SystemServiceStatus): ServiceInfoNote | null {
  if (service.id !== "embedding") {
    return null;
  }

  if (service.status === "preview") {
    return {
      title: "Embedding（演示说明）",
      message:
        "Preview 模式下未调用远程向量化服务，检索切块为 BFF 模拟结果，与生产 embedding 质量可能不同。",
    };
  }

  if (service.status === "unknown") {
    return {
      title: "Embedding 未启用检查",
      message:
        "上游 /health 返回 skipped，表示当前驱动或环境未启用 embedding 探测；不代表一定故障。",
    };
  }

  return null;
}

export function resolveServiceAbnormalHint(
  service: SystemServiceStatus,
): ServiceAbnormalHint | null {
  if (service.status === "healthy" || service.status === "preview") {
    return null;
  }

  if (service.status === "unreachable") {
    return {
      title: `${service.label} 无法读取`,
      message: service.detail,
      action: "请检查 API_BASE_URL、网络连通性与 apps/api 进程是否运行。",
    };
  }

  switch (service.id) {
    case "api":
      return {
        title: "API 服务异常",
        message: service.detail,
        action: "查看 apps/api 日志，确认 /health 返回 degraded 的具体依赖项。",
      };
    case "postgres":
      return {
        title: "PostgreSQL 不可用或降级",
        message: service.detail,
        action:
          "确认 DATABASE_URL 配置正确，数据库可连接；memory 驱动下数据重启后可能丢失。",
      };
    case "redis":
      return {
        title: "Redis 未就绪",
        message: service.detail,
        action:
          service.status === "unknown"
            ? "若未启用 Redis，文档队列可能由 worker 本地模拟；生产环境建议配置 REDIS_URL。"
            : "检查 REDIS_URL 与 Redis 服务状态，确保 worker 可消费文档任务。",
      };
    case "qdrant":
      return {
        title: "向量库异常",
        message: service.detail,
        action:
          "确认 VECTOR_STORE_DRIVER 与 Qdrant 地址；memory 模式下检索结果为进程内模拟。",
      };
    case "minio":
      return {
        title: "对象存储异常",
        message: service.detail,
        action:
          "检查 DOCUMENT_STORAGE_DRIVER；local 模式文件存本地磁盘，minio 模式需配置端点与凭证。",
      };
    case "embedding":
      return {
        title: "Embedding 服务降级",
        message: service.detail,
        action: /LLM_EMBEDDING_API_KEY|OPENAI_API_KEY/i.test(service.detail)
          ? "在项目根 .env 配置 LLM_EMBEDDING_API_KEY 或 OPENAI_API_KEY，重启 api 与 worker。"
          : "确认 embedding provider 可达，密钥有效，且 worker 可调用向量化接口。",
      };
    default:
      return {
        title: `${service.label} 状态异常`,
        message: service.detail,
        action: "联系运维或查看 apps/api /health 原始响应排查。",
      };
  }
}

export function summarizeServiceStatuses(services: SystemServiceStatus[]) {
  return {
    healthy: services.filter((s) => s.status === "healthy").length,
    degraded: services.filter((s) => s.status === "degraded").length,
    unreachable: services.filter((s) => s.status === "unreachable").length,
    preview: services.filter((s) => s.status === "preview").length,
    unknown: services.filter((s) => s.status === "unknown").length,
    total: services.length,
    hasIssue: services.some(
      (s) => s.status === "degraded" || s.status === "unreachable" || s.status === "unknown",
    ),
  };
}

export function statusLabel(status: ServiceProbeStatus): string {
  switch (status) {
    case "healthy":
      return "正常";
    case "degraded":
      return "降级";
    case "unreachable":
      return "不可达";
    case "preview":
      return "演示";
    default:
      return "待确认";
  }
}

export function statusVariant(
  status: ServiceProbeStatus,
): "success" | "warning" | "destructive" | "info" | "outline" {
  switch (status) {
    case "healthy":
      return "success";
    case "degraded":
      return "warning";
    case "unreachable":
      return "destructive";
    case "preview":
      return "info";
    default:
      return "outline";
  }
}

export function overallHealthTone(
  summary: ReturnType<typeof summarizeServiceStatuses>,
  mode: "preview" | "upstream",
): "default" | "warning" | "danger" {
  if (mode === "preview") return "default";
  if (summary.unreachable > 0) return "danger";
  if (summary.degraded > 0 || summary.unknown > 0) return "warning";
  return "default";
}

export function overallHealthLabel(
  summary: ReturnType<typeof summarizeServiceStatuses>,
  mode: "preview" | "upstream",
): string {
  if (mode === "preview") return "演示模式";
  if (summary.unreachable > 0) return "无法读取上游状态";
  if (summary.degraded > 0) return "部分服务降级";
  if (summary.unknown > 0) return "部分状态待确认";
  if (summary.healthy === summary.total) return "全部正常";
  return "运行中";
}
