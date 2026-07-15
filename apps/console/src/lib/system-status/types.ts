export type ServiceProbeStatus =
  | "healthy"
  | "degraded"
  | "unreachable"
  | "preview"
  | "unknown";

export interface SystemServiceStatus {
  id: string;
  label: string;
  status: ServiceProbeStatus;
  detail: string;
}

export type HealthFormat = "preview" | "unified";

export interface SystemStatusSnapshot {
  mode: "preview" | "upstream";
  upstreamConfigured: boolean;
  modeMessage: string;
  upstreamReachable?: boolean;
  apiDriver?: string;
  upstreamCheckedAt?: string;
  healthFormat?: HealthFormat;
  /** 上游 /health 是否返回完整 services[]（false 时为降级展示，非 legacy 路径） */
  healthServicesComplete?: boolean;
  services: SystemServiceStatus[];
  workspaceNote: string;
  checkedAt: string;
}

export type ServiceGroupId = "core" | "data" | "queue" | "vector" | "storage" | "ai";

export interface ServiceGroupMeta {
  id: ServiceGroupId;
  label: string;
  description: string;
  serviceIds: string[];
}

export const SERVICE_GROUPS: ServiceGroupMeta[] = [
  {
    id: "core",
    label: "控制台与 API",
    description: "Console BFF 与 apps/api 连通性",
    serviceIds: ["api"],
  },
  {
    id: "data",
    label: "持久化",
    description: "业务数据与会话持久化",
    serviceIds: ["postgres"],
  },
  {
    id: "queue",
    label: "队列",
    description: "文档解析与异步任务",
    serviceIds: ["redis"],
  },
  {
    id: "vector",
    label: "向量检索",
    description: "RAG 切块与相似度检索",
    serviceIds: ["qdrant"],
  },
  {
    id: "storage",
    label: "文件存储",
    description: "知识库原文与附件",
    serviceIds: ["minio"],
  },
  {
    id: "ai",
    label: "Embedding",
    description: "文本向量化与检索质量",
    serviceIds: ["embedding"],
  },
];
