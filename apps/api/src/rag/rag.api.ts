import { RagAccessError, RagService, RagValidationError } from "./rag.service";

export interface RagRequestContext {
  workspaceId: string;
}

export class RagApi {
  constructor(private readonly service: RagService) {}

  search(
    context: RagRequestContext,
    body: {
      botId: string;
      query: string;
      topK?: number;
      maxCitations?: number;
    },
  ) {
    return this.service.search({
      workspaceId: context.workspaceId,
      botId: body.botId,
      query: body.query,
      topK: body.topK,
      maxCitations: body.maxCitations,
    });
  }
}

export function toRagHttpError(error: unknown): { statusCode: number; code: string; message: string } {
  if (error instanceof RagAccessError) {
    return { statusCode: 404, code: "NOT_FOUND", message: error.message };
  }

  if (error instanceof RagValidationError) {
    return { statusCode: 400, code: "VALIDATION_ERROR", message: error.message };
  }

  return { statusCode: 500, code: "INTERNAL_ERROR", message: "Unexpected error." };
}
