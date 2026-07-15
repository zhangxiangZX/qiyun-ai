import { apiFormDataRequest, apiRequest } from "@/lib/api/client";
import { listDocumentsMock } from "./mock-data";
import type { DocumentItem, ListDocumentsResult, UploadDocumentInput } from "./types";

export async function listDocumentsFromApi(): Promise<DocumentItem[]> {
  try {
    const data = await apiRequest<ListDocumentsResult>("/files");
    return data?.documents ?? [];
  } catch (error) {
    // V2 后端未就绪：apps/api GET /files 由本会话实现（Task #12）。
    // 上游模式下退化到演示数据，保证文档中心在 V2 预览阶段可演示。
    console.warn(
      "[documents] upstream GET /files unavailable, falling back to preview data. " +
        "TODO: implement apps/api GET /files if not deployed.",
      error,
    );
    return listDocumentsMock();
  }
}

export async function uploadDocumentToApi(input: UploadDocumentInput): Promise<DocumentItem> {
  const form = new FormData();
  form.append("file", input.file);
  form.append("category", input.category);
  return apiFormDataRequest<DocumentItem>("/files", form);
}

export async function deleteDocumentFromApi(id: string): Promise<void> {
  await apiRequest(`/files/${id}`, { method: "DELETE" });
}

export async function getDocumentFromApi(id: string): Promise<DocumentItem | null> {
  try {
    const data = await apiRequest<DocumentItem>(`/files/${id}`);
    return data ?? null;
  } catch {
    return null;
  }
}
