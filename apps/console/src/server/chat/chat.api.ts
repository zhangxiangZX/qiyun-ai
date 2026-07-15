import { ChatAccessError, ChatService, ChatValidationError } from "./chat.service";
import type { ChatStreamRequest, LeadSubmissionRequest } from "./chat.types";
import type { RequestContext } from "@/server/workspace";

export { ChatAccessError, ChatValidationError };

export class PublicChatApi {
  constructor(private readonly service: ChatService) {}

  async stream(body: ChatStreamRequest) {
    return this.service.stream(body);
  }

  async submitLead(body: LeadSubmissionRequest) {
    return this.service.submitLead(body);
  }

  async listConversations(
    context: RequestContext,
    options?: { limit?: number; cursor?: string },
  ) {
    return this.service.listConversations(context.workspaceId, options);
  }

  async getConversation(context: RequestContext, conversationId: string) {
    return this.service.getConversation(context.workspaceId, conversationId);
  }

  async getPreviewSite(context: RequestContext, botId: string) {
    return this.service.getPreviewSite(context.workspaceId, botId);
  }
}

export function toChatHttpError(error: unknown): {
  statusCode: number;
  code: string;
  message: string;
} {
  if (error instanceof ChatAccessError) {
    return { statusCode: 403, code: "FORBIDDEN", message: error.message };
  }

  if (error instanceof ChatValidationError) {
    return { statusCode: 400, code: "VALIDATION_ERROR", message: error.message };
  }

  return { statusCode: 500, code: "INTERNAL_ERROR", message: "Unexpected error." };
}
