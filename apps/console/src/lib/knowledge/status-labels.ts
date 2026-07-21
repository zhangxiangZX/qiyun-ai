import type { DocumentStatus } from "./types";

export type DocumentPipelineStep =
  | "uploading"
  | "parsing"
  | "indexing"
  | "ready"
  | "failed";

export const DOCUMENT_PIPELINE_STEPS: Array<{
  key: DocumentPipelineStep;
  label: string;
  description: string;
  badgeVariant: "default" | "info" | "success" | "destructive";
}> = [
  {
    key: "uploading",
    label: "已接收",
    description: "文件已上传并进入接收队列，等待解析",
    badgeVariant: "default",
  },
  {
    key: "parsing",
    label: "解析中",
    description: "提取文本与文档结构",
    badgeVariant: "info",
  },
  {
    key: "indexing",
    label: "建索引中",
    description: "切块并写入向量索引",
    badgeVariant: "info",
  },
  {
    key: "ready",
    label: "已完成",
    description: "可被机器人检索与引用",
    badgeVariant: "success",
  },
  {
    key: "failed",
    label: "失败",
    description: "处理失败，可查看错误并重试",
    badgeVariant: "destructive",
  },
];

export function mapDocumentStatusToPipeline(status: DocumentStatus): DocumentPipelineStep {
  switch (status) {
    case "uploaded":
      return "uploading";
    case "parsing":
      return "parsing";
    case "indexing":
      return "indexing";
    case "ready":
      return "ready";
    case "failed":
      return "failed";
  }
}

export function getPipelineStepMeta(step: DocumentPipelineStep) {
  return DOCUMENT_PIPELINE_STEPS.find((item) => item.key === step)!;
}

/**
 * 展示态（含客户端排队）：queued 仅存在于上传队列，DocumentStatus 从 uploaded 起。
 * 映射：queued(客户端) → uploaded → parsing → indexing → ready | failed
 */
export type DocumentDisplayStatus = "queued" | DocumentStatus;

export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  uploaded: "已接收",
  parsing: "解析中",
  indexing: "建索引中",
  ready: "已完成",
  failed: "失败",
};

export const DOCUMENT_DISPLAY_STATUS_LABELS: Record<DocumentDisplayStatus, string> = {
  queued: "排队中",
  ...DOCUMENT_STATUS_LABELS,
};

export const DOCUMENT_STATUS_DESCRIPTIONS: Record<DocumentStatus, string> = {
  uploaded: "文件已接收，等待 worker 拉取解析任务",
  parsing: "正在提取文本与文档结构（状态轮询更新，非实时字节进度）",
  indexing: "正在切块并写入向量索引（状态轮询更新）",
  ready: "索引完成，可用于检索与引用",
  failed: "处理失败，请查看下方原因说明",
};

/** 文档列表与上传区轮询间隔（秒） */
export const DOCUMENT_POLL_INTERVAL_SECONDS = 2;

/** 上传/处理进度说明：明确为状态轮询，非字节级进度条 */
export const DOCUMENT_STATUS_POLLING_NOTE =
  "进度通过每 2 秒查询文档状态更新，展示的是处理阶段（已接收 → 解析中 → 建索引中 → 已完成），不是文件传输百分比。";

/** 上传队列 / 批量结果中展示的后端处理阶段文案 */
export const DOCUMENT_PROCESSING_STAGE_LABELS: Record<DocumentStatus, string> = {
  uploaded: "已接收",
  parsing: "解析中",
  indexing: "建索引中",
  ready: "已完成",
  failed: "失败",
};

/** 五态用户向短说明（用于进度列表） */
export const DOCUMENT_STATUS_PROGRESS_HINTS: Record<DocumentStatus, string> = {
  uploaded: "文件已进入后端队列，等待解析",
  parsing: "正在解析文本，请稍候",
  indexing: "正在写入向量索引",
  ready: "处理完成，可检索",
  failed: "处理中断，请查看原因",
};

export function getStatusBadgeVariant(
  status: DocumentStatus,
): "default" | "info" | "warning" | "success" | "destructive" {
  return getPipelineStepMeta(mapDocumentStatusToPipeline(status)).badgeVariant;
}

export const KNOWLEDGE_BASE_STATUS_LABELS = {
  active: "启用",
  disabled: "停用",
} as const;

export function getKnowledgeBaseStatusBadgeVariant(
  status: keyof typeof KNOWLEDGE_BASE_STATUS_LABELS,
): "success" | "warning" {
  return status === "active" ? "success" : "warning";
}
