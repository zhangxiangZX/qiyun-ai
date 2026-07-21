import type { OpenAICompatibleChatClient } from "../llm/llm-chat";
import type { CreateInquiryInput } from "../sales/sales.types";
import { SalesService } from "../sales/sales.service";
import { extractQuickEntryFieldsWithLlm } from "./quick-entry-extract";

export class QuickEntryService {
  constructor(
    private readonly sales: SalesService,
    private readonly llmChat: OpenAICompatibleChatClient | null = null,
  ) {}

  async aiExtract(workspaceId: string, text: string) {
    const rules = await this.sales.getBusinessRules(workspaceId);
    return extractQuickEntryFieldsWithLlm(this.llmChat, text, rules);
  }

  async createInquiryFromAI(workspaceId: string, body: CreateInquiryInput) {
    return this.sales.createInquiry(workspaceId, body);
  }

  async checkDuplicate(workspaceId: string, phone: string) {
    const duplicate = await this.sales.findDuplicateInquiryByPhone(workspaceId, phone);
    return {
      duplicate: Boolean(duplicate),
      match: duplicate,
    };
  }
}

export class QuickEntryApi {
  constructor(private readonly service: QuickEntryService) {}
  aiExtract(context: { workspaceId: string }, text: string) {
    return this.service.aiExtract(context.workspaceId, text);
  }
  createInquiryFromAI(context: { workspaceId: string }, body: CreateInquiryInput) {
    return this.service.createInquiryFromAI(context.workspaceId, body);
  }
  checkDuplicate(context: { workspaceId: string }, phone: string) {
    return this.service.checkDuplicate(context.workspaceId, phone);
  }
}
