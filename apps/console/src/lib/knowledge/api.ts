import { apiFormDataRequest, apiRequest } from "@/lib/api/client";
import type {
  DeleteKnowledgeBaseResult,
  DeleteKnowledgeDocumentResult,
  KnowledgeBase,
  KnowledgeDocument,
  KnowledgeDocumentChunk,
} from "@/lib/knowledge/types";

export async function listKnowledgeBases(): Promise<KnowledgeBase[]> {
  return apiRequest<KnowledgeBase[]>("/knowledge-bases");
}

export async function createKnowledgeBase(name: string): Promise<KnowledgeBase> {
  return apiRequest<KnowledgeBase>("/knowledge-bases", {
    method: "POST",
    body: { name },
  });
}

export async function getKnowledgeBase(id: string): Promise<KnowledgeBase> {
  return apiRequest<KnowledgeBase>(`/knowledge-bases/${id}`);
}

export async function updateKnowledgeBase(
  id: string,
  patch: { name?: string; status?: "active" | "disabled" },
): Promise<KnowledgeBase> {
  return apiRequest<KnowledgeBase>(`/knowledge-bases/${id}`, {
    method: "PATCH",
    body: patch,
  });
}

export async function deleteKnowledgeBase(id: string): Promise<DeleteKnowledgeBaseResult> {
  return apiRequest<DeleteKnowledgeBaseResult>(`/knowledge-bases/${id}`, {
    method: "DELETE",
  });
}

export async function listKnowledgeBaseDocuments(
  knowledgeBaseId: string,
): Promise<KnowledgeDocument[]> {
  return apiRequest<KnowledgeDocument[]>(`/knowledge-bases/${knowledgeBaseId}/documents`);
}

export async function uploadDocumentFiles(
  knowledgeBaseId: string,
  files: File[],
): Promise<KnowledgeDocument[]> {
  const formData = new FormData();

  for (const file of files) {
    formData.append("files", file, file.name);
  }

  return apiFormDataRequest<KnowledgeDocument[]>(
    `/knowledge-bases/${knowledgeBaseId}/documents`,
    formData,
  );
}

export async function uploadSingleDocumentFile(
  knowledgeBaseId: string,
  file: File,
): Promise<KnowledgeDocument[]> {
  return uploadDocumentFiles(knowledgeBaseId, [file]);
}

export async function getDocument(documentId: string): Promise<KnowledgeDocument> {
  return apiRequest<KnowledgeDocument>(`/documents/${documentId}`);
}

export async function reindexDocument(documentId: string): Promise<KnowledgeDocument> {
  return apiRequest<KnowledgeDocument>(`/documents/${documentId}/reindex`, {
    method: "POST",
  });
}

/** 重新解析文档（重新提取文本后再索引）。上游未实现时 BFF 返回 503。 */
export async function reparseDocument(documentId: string): Promise<KnowledgeDocument> {
  return apiRequest<KnowledgeDocument>(`/documents/${documentId}/reparse`, {
    method: "POST",
  });
}

export async function deleteDocument(documentId: string): Promise<DeleteKnowledgeDocumentResult> {
  return apiRequest<DeleteKnowledgeDocumentResult>(`/documents/${documentId}`, {
    method: "DELETE",
  });
}

export async function listDocumentChunks(
  documentId: string,
): Promise<KnowledgeDocumentChunk[]> {
  return apiRequest<KnowledgeDocumentChunk[]>(`/documents/${documentId}/chunks`);
}
