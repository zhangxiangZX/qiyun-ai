import type { BotDetail } from "@/lib/bots/types";
import type { ChatStreamResult } from "@/lib/chat/api";

function splitTokens(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  return trimmed.split(/(\s+)/).filter(Boolean);
}

function mockReply(input: string, _bot: BotDetail): { content: string; citations: ChatStreamResult["citations"]; needsLeadCapture: boolean } {
  const text = input.trim().toLowerCase();
  if (!text) {
    return { content: "请输入你想咨询的问题。", citations: [], needsLeadCapture: false };
  }
  if (text.includes("价格") || text.includes("报价") || text.includes("套餐")) {
    return {
      content: "我们提供标准版与企业版两种套餐，可按坐席与知识库容量扩展。需要我帮你安排演示吗？",
      citations: [{ title: "销售话术库 / 套餐说明", snippet: "企业版支持按坐席与知识库容量扩展。" }],
      needsLeadCapture: false,
    };
  }
  if (text.includes("保修") || text.includes("质保")) {
    return {
      content: "根据产品支持文档，电机质保期为 24 个月。",
      citations: [{ title: "产品支持文档", snippet: "电机质保期为 24 个月。" }],
      needsLeadCapture: false,
    };
  }
  return {
    content: "目前资料里没有足够信息，我可以先记录您的需求并安排人工跟进。",
    citations: [],
    needsLeadCapture: true,
  };
}

export async function streamPreviewChatMessage(input: {
  bot: BotDetail;
  message: string;
  conversationId?: string;
}): Promise<ChatStreamResult> {
  const reply = mockReply(input.message, input.bot);
  const conversationId = input.conversationId ?? `preview_conv_${Date.now()}`;
  const messageId = `preview_msg_${Date.now()}`;
  const tokens = splitTokens(reply.content);

  await new Promise((resolve) => window.setTimeout(resolve, 400));

  let content = "";
  for (const token of tokens) {
    content += token;
    await new Promise((resolve) => window.setTimeout(resolve, 30));
  }

  return {
    conversationId,
    messageId,
    content,
    citations: reply.citations,
    needsLeadCapture: reply.needsLeadCapture,
  };
}
