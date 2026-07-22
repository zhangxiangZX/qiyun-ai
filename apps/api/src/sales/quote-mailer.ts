export interface QuoteEmailInput {
  recipient: string;
  subject: string;
  text: string;
  fileName: string;
  pdfBytes: Uint8Array;
  attachments?: Array<{ fileName: string; contentBytes: Uint8Array }>;
}

export async function sendQuoteEmail(input: QuoteEmailInput): Promise<"sent" | "queued"> {
  if (process.env.EMAIL_PROVIDER?.trim().toLowerCase() !== "resend") return "queued";
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  if (!apiKey || !from) throw new Error("RESEND_API_KEY and EMAIL_FROM are required for quote delivery.");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      from,
      to: [input.recipient],
      reply_to: process.env.EMAIL_REPLY_TO?.trim() || undefined,
      subject: input.subject,
      text: input.text,
      attachments: [
        { filename: input.fileName, content: Buffer.from(input.pdfBytes).toString("base64") },
        ...(input.attachments ?? []).map((item) => ({
          filename: item.fileName,
          content: Buffer.from(item.contentBytes).toString("base64"),
        })),
      ],
    }),
  });
  if (!response.ok) throw new Error(`Resend quote email failed: ${response.status} ${await response.text()}`);
  return "sent";
}
