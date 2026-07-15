export interface ParsedUploadFile {
  fileName: string;
  fileType: string;
  sizeBytes: number;
  contentBytes: Uint8Array | null;
}

export async function readUploadBody(request: Request): Promise<ParsedUploadFile[]> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const files: ParsedUploadFile[] = [];

    for (const value of formData.values()) {
      if (!(value instanceof File)) {
        continue;
      }

      files.push({
        fileName: value.name,
        fileType: value.type || "application/octet-stream",
        sizeBytes: value.size,
        contentBytes: new Uint8Array(await value.arrayBuffer()),
      });
    }

    return files;
  }

  const body = (await request.json()) as
    | Array<{
        fileName?: string;
        fileType?: string;
        sizeBytes?: number;
        contentBase64?: string;
      }>
    | undefined;

  const files = Array.isArray(body) ? body : [];

  return files.map((file) => ({
    fileName: file.fileName ?? "",
    fileType: file.fileType ?? "application/octet-stream",
    sizeBytes: file.sizeBytes ?? 0,
    contentBytes: file.contentBase64
      ? Uint8Array.from(Buffer.from(file.contentBase64, "base64"))
      : null,
  }));
}
