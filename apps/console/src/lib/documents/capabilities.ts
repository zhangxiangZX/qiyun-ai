import { fetchConsoleMode, isPreviewMode } from "@/lib/api/mode";

export interface DocumentCapabilities {
  dataMode: "preview" | "upstream";
  /** Upload allowed (always true in both modes for V2 preview). */
  canUpload: boolean;
  /** Watermark available (client-side for images in preview; backend for all in upstream). */
  canWatermark: boolean;
  uploadNote?: string;
  watermarkNote?: string;
}

export async function getDocumentCapabilities(): Promise<DocumentCapabilities> {
  const mode = await fetchConsoleMode();
  if (isPreviewMode(mode)) {
    return {
      dataMode: "preview",
      canUpload: true,
      canWatermark: true,
      uploadNote:
        "上传的文件仅保存在本次会话内存中（演示），不会写入 apps/api。",
      watermarkNote:
        "预览模式下图片将即时在浏览器本地加水印；PDF / 文档类水印由上游服务生成。",
    };
  }
  return {
    dataMode: "upstream",
    canUpload: true,
    canWatermark: true,
    watermarkNote: "水印由上游服务（apps/api POST /documents/:id/watermark）生成。",
  };
}
