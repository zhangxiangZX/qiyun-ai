import { fetchConsoleMode, isPreviewMode } from "@/lib/api/mode";
import {
  createDocumentMock,
  listDocumentsMock,
  removePreviewDocument,
} from "./mock-data";
import {
  deleteDocumentFromApi,
  getDocumentFromApi,
  listDocumentsFromApi,
  uploadDocumentToApi,
} from "./api";
import { watermarkImageBlob } from "./watermark-client";
import type { DocumentItem, UploadDocumentInput } from "./types";

export async function listDocuments(): Promise<DocumentItem[]> {
  const mode = await fetchConsoleMode();
  if (isPreviewMode(mode)) return listDocumentsMock();
  return listDocumentsFromApi();
}

export async function uploadDocument(input: UploadDocumentInput): Promise<DocumentItem> {
  const mode = await fetchConsoleMode();
  if (isPreviewMode(mode)) return createDocumentMock(input);
  return uploadDocumentToApi(input);
}

export async function deleteDocument(id: string): Promise<void> {
  const mode = await fetchConsoleMode();
  if (isPreviewMode(mode)) {
    removePreviewDocument(id);
    return;
  }
  await deleteDocumentFromApi(id);
}

/** Fetches the original file blob from the BFF download route (preview or upstream). */
export async function downloadDocumentBlob(id: string): Promise<Blob> {
  const res = await fetch(`/api/files/${id}/download`, { credentials: "include" });
  if (!res.ok) {
    throw new Error(`下载失败（${res.status}）`);
  }
  return res.blob();
}

/**
 * Fetches the (possibly watermarked) file blob from the BFF watermark route.
 *
 * The backend watermark service only injects a watermark into textual files
 * (it has no sharp/pdf-lib for images / pdf). For images / pdf it returns the
 * original bytes untouched, signalling `x-watermark-applied: false`. The
 * document center page applies a client-side canvas watermark to images from
 * the returned bytes, so image protection is preserved end-to-end.
 */
export async function downloadWatermarkedBlob(id: string): Promise<Blob> {
  const res = await fetch(`/api/files/${id}/watermark`, { credentials: "include" });
  if (!res.ok) {
    throw new Error(`水印下载失败（${res.status}）`);
  }
  return res.blob();
}
