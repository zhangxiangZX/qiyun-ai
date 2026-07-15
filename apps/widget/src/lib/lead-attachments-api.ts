export const ACCEPTED_LEAD_ATTACHMENT_TYPES =
  ".pdf,.png,.jpg,.jpeg,.webp,.zip,.dwg,.dxf,.doc,.docx";

export const MAX_LEAD_ATTACHMENT_BYTES = 10 * 1024 * 1024;

export function formatAttachmentSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function validateLeadAttachmentFile(file: File): string | null {
  if (file.size > MAX_LEAD_ATTACHMENT_BYTES) {
    return `文件不能超过 ${formatAttachmentSize(MAX_LEAD_ATTACHMENT_BYTES)}。`;
  }
  return null;
}

/** Returns true when the upstream exposes POST /public/leads/attachments. */
export async function probeLeadAttachmentUpload(apiBase: string): Promise<boolean> {
  try {
    const response = await fetch(`${apiBase.replace(/\/$/, "")}/public/leads/attachments`, {
      method: "POST",
      body: new FormData(),
    });
    return response.status !== 404 && response.status !== 405 && response.status !== 501;
  } catch {
    return false;
  }
}

export async function uploadLeadAttachment(input: {
  apiBase: string;
  botId: string;
  siteKey: string;
  conversationId: string;
  file: File;
}): Promise<{ id: string; fileName: string }> {
  const form = new FormData();
  form.append("file", input.file);
  form.append("botId", input.botId);
  form.append("siteKey", input.siteKey);
  form.append("conversationId", input.conversationId);

  const response = await fetch(`${input.apiBase.replace(/\/$/, "")}/public/leads/attachments`, {
    method: "POST",
    body: form,
  });

  if (!response.ok) {
    let message = `附件上传失败 (${response.status})`;
    try {
      const payload = (await response.json()) as { message?: string };
      if (payload.message) message = payload.message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }

  const payload = (await response.json()) as { id?: string; fileName?: string };
  return {
    id: payload.id ?? "",
    fileName: payload.fileName ?? input.file.name,
  };
}
