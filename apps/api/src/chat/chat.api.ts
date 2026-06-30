import { ChatAccessError, ChatService, ChatValidationError } from "./chat.service";
import type { ChatStreamRequest } from "./chat.types";

export class PublicChatApi {
  constructor(private readonly service: ChatService) {}

  stream(body: ChatStreamRequest) {
    return this.service.stream(body);
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
