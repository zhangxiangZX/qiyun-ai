import { fetchConsoleMode, isPreviewMode, type ConsoleModeInfo } from "@/lib/api/mode";

export interface KnowledgeCapabilities {
  storageHint: string;
  pipelineHint: string;
  previewDifferenceHint: string;
  /** 单文档 DELETE /documents/:id 是否可用（需上游 API） */
  documentDeleteAvailable: boolean;
  documentDeleteHint: string;
}

const PREVIEW_DIFFERENCE_HINT =
  "Preview / BFF 模式下，文档解析与索引在 Console 内模拟推进；失败码目前以 parser_unstable_sections 为主（如文件名含 fail），与生产 worker 的 errorCode 分布不完全一致，仅用于联调演示，不能等同生产验证。";

const PREVIEW_DELETE_HINT =
  "未配置 API_BASE_URL 时，Console 运行在 Preview / BFF 模式，单文档删除不会调用上游 API，BFF 将返回 503。配置真实上游后，删除能力才会正式生效。";

const UPSTREAM_DIFFERENCE_HINT =
  "生产环境中，文档处理由 apps/api + worker 异步队列驱动，状态刷新存在数秒延迟；与本地 Preview 模拟的推进速度可能不同。";

export function resolveKnowledgeCapabilities(info: ConsoleModeInfo): KnowledgeCapabilities {
  const preview = isPreviewMode(info);

  if (preview) {
    return {
      storageHint:
        "演示模式：文件仅写入 Console 内存 BFF，不涉及 MinIO 或服务器磁盘；刷新或服务重启后可能丢失。",
      pipelineHint:
        "解析与索引在 BFF 内模拟推进，不连接真实 worker / Qdrant；失败码分布与生产不完全一致，可用于 UI 联调演示。",
      previewDifferenceHint: PREVIEW_DIFFERENCE_HINT,
      documentDeleteAvailable: false,
      documentDeleteHint: PREVIEW_DELETE_HINT,
    };
  }

  const driverNote =
    info.upstream?.apiDriver === "postgres"
      ? "业务数据持久化至 PostgreSQL。"
      : info.upstream?.reachable === false
        ? "暂时无法读取上游 /health，存储与索引能力以 apps/api 实际配置为准。"
        : "上游运行态已连接。";

  return {
    storageHint: `Upstream：multipart 上传经 BFF 代理至 apps/api。文件原件落在后端配置的本地目录（DOCUMENT_STORAGE_DIR）或 MinIO，由运维环境决定，Console 不直接感知驱动。${driverNote}`,
    pipelineHint:
      "解析与向量索引依赖 apps/api + worker 队列及 Qdrant 是否启用；未配置时文档可能停留在 parsing/indexing 或仅本地检索。",
    previewDifferenceHint: UPSTREAM_DIFFERENCE_HINT,
    documentDeleteAvailable: true,
    documentDeleteHint: "",
  };
}

export async function getKnowledgeCapabilities(): Promise<KnowledgeCapabilities> {
  const mode = await fetchConsoleMode();
  return resolveKnowledgeCapabilities(mode);
}
