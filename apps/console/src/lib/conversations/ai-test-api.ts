import { apiRequest } from "@/lib/api/client";

export async function testBotChat(
  botId: string,
  message: string,
): Promise<{ reply: string }> {
  return apiRequest<{ reply: string }>(`/bots/${encodeURIComponent(botId)}/test-chat`, {
    method: "POST",
    body: { message },
  });
}
