import { processDocumentJob } from "./document-processor";
import type { DocumentService } from "./document.service";
import type { DocumentStorage } from "./document-storage";
import type { DocumentIndexJob } from "./document.types";
import type { RagService } from "../rag/rag.service";
import { runWithTenant } from "../db/tenant-context";

export async function executeDocumentJob(input: {
  job: DocumentIndexJob;
  documentService: DocumentService;
  ragService: RagService;
  storage: DocumentStorage;
  persist?: () => Promise<void>;
}): Promise<void> {
  // 后台任务无请求上下文，需显式注入租户上下文，供 RLS 对写操作做行级校验。
  await runWithTenant(input.job.workspaceId, async () => {
    let result;

    try {
      result = await processDocumentJob(
        {
          documentId: input.job.documentId,
          workspaceId: input.job.workspaceId,
          knowledgeBaseId: input.job.knowledgeBaseId,
          filename: input.job.fileName,
          fileType: input.job.fileType,
          sizeBytes: input.job.sizeBytes,
          storageKey: input.job.storageKey,
          attempt: input.job.attempts,
        },
        input.storage,
      );
    } catch (error) {
      await input.documentService.applyWorkerStatus({
        workspaceId: input.job.workspaceId,
        documentId: input.job.documentId,
        status: "failed",
        errorCode: "processing_failed",
        errorMessage: error instanceof Error ? error.message : String(error),
      });
      if (input.persist) {
        await input.persist();
      }
      throw error;
    }

    for (const transition of result.transitions.slice(1)) {
      const updated = await input.documentService.applyWorkerStatus({
        workspaceId: input.job.workspaceId,
        documentId: input.job.documentId,
        status: transition.status,
        chunkCount: transition.chunkCount ?? null,
        errorCode: transition.errorCode ?? null,
        errorMessage: transition.errorMessage ?? null,
      });

      if (updated.status === "ready") {
        await input.ragService.replaceDocumentChunks({
          workspaceId: updated.workspaceId,
          knowledgeBaseId: updated.knowledgeBaseId,
          documentId: updated.id,
          documentTitle: updated.fileName,
          chunks: result.chunks,
        });
      }

      if (input.persist) {
        await input.persist();
      }
    }
  });
}
