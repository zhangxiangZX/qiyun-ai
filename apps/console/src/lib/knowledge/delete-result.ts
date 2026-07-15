import type { DeleteKnowledgeDocumentResult } from "./types";

export function formatDeleteDocumentSuccessMessage(
  fileName: string,
  result: DeleteKnowledgeDocumentResult,
): string {
  const parts = [
    `已删除文档「${fileName}」`,
    `已清理 ${result.removedChunkCount} 条索引片段`,
  ];

  if (result.storageAction === "archived") {
    parts.push("原文件已归档保存");
  }

  return `${parts.join("；")}。`;
}
