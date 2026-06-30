import { ChatAccessError, ChatService, ChatValidationError } from "./chat.service";
import type { ChatStreamRequest, LeadSubmissionRequest } from "./chat.types";

export class PublicChatApi {
  constructor(private readonly service: ChatService) {}

  async stream(body: ChatStreamRequest) {
    return this.service.stream(body);
  }

  async submitLead(body: LeadSubmissionRequest) {
    return this.service.submitLead(body);
  }

  async listConversations(workspaceId: string) {
    return this.service.listConversations(workspaceId);
  }

  async getConversation(workspaceId: string, conversationId: string) {
    return this.service.getConversation(workspaceId, conversationId);
  }
}

export function toChatHttpError(error: unknown): { statusCode: number; code: string; message: string } {
  if (error instanceof ChatAccessError) {
    return { statusCode: 403, code: "FORBIDDEN", message: error.message };
  }

  if (error instanceof ChatValidationError) {
    return { statusCode: 400, code: "VALIDATION_ERROR", message: error.message };
  }

  return { statusCode: 500, code: "INTERNAL_ERROR", message: "Unexpected error." };
}
