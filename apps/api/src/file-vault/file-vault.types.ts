export type DocumentKind = "pdf" | "image" | "doc" | "sheet" | "other";

export type DocumentCategory =
  | "brochure"
  | "spec"
  | "quote"
  | "contract"
  | "lead"
  | "other";

export interface DocumentItem {
  id: string;
  name: string;
  kind: DocumentKind;
  category: DocumentCategory;
  sizeBytes: number;
  uploadedAt: string;
  uploadedBy: string;
  /** Can this file type be watermarked (images / pdf). */
  watermarkable: boolean;
  /** Whether a watermarked copy has been generated. */
  watermarked: boolean;
  status: "ready" | "processing" | "failed";
  mimeType?: string;
}

export interface StoredFile extends DocumentItem {
  contentBytes: Uint8Array;
}

export interface UploadFileInput {
  fileName: string;
  fileType: string;
  sizeBytes: number;
  contentBytes: Uint8Array;
  category: DocumentCategory;
  uploadedBy: string;
}

export interface WatermarkResult {
  bytes: Uint8Array;
  mimeType: string;
  applied: boolean;
  mode: "server_text_overlay" | "client_binary_overlay";
}

export interface ListDocumentsResult {
  documents: DocumentItem[];
}
