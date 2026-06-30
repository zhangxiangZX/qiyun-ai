import { apiRequest } from "@/lib/api/client";
import type {
  DeleteKnowledgeBaseResult,
  KnowledgeBase,
  KnowledgeDocument,
  UploadDocumentInput,
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

export async function uploadDocuments(
  knowledgeBaseId: string,
  files: UploadDocumentInput[],
): Promise<KnowledgeDocument[]> {
  return apiRequest<KnowledgeDocument[]>(`/knowledge-bases/${knowledgeBaseId}/documents`, {
    method: "POST",
    body: files,
  });
}

export async function getDocument(documentId: string): Promise<KnowledgeDocument> {
  return apiRequest<KnowledgeDocument>(`/documents/${documentId}`);
}

export async function reindexDocument(documentId: string): Promise<KnowledgeDocument> {
  return apiRequest<KnowledgeDocument>(`/documents/${documentId}/reindex`, {
    method: "POST",
  });
}
