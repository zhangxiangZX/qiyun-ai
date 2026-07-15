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

export interface DocumentCategoryMeta {
  label: string;
  color: string;
}

export interface UploadDocumentInput {
  file: File;
  category: DocumentCategory;
  uploadedBy: string;
}

export interface ListDocumentsResult {
  documents: DocumentItem[];
}
