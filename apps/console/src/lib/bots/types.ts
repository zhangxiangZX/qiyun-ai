export type BotStatus = "enabled" | "disabled" | "draft";

export type BotEditSection = "basics" | "knowledge" | "behavior" | "leads" | "install";

export interface BotListItem {
  id: string;
  name: string;
  status: BotStatus;
  knowledgeBaseCount: number;
  conversations7d: number;
  updatedAt: string;
}

export interface BotDetail extends BotListItem {
  description: string;
  welcomeMessage: string;
  recommendedQuestions: string[];
  systemPrompt: string;
  knowledgeBaseIds: string[];
  collectLeadsOnFailure: boolean;
  rateLimitPerMinute: number;
  allowedDomains: string[];
  leadFields: string[];
  llmTemperature: number;
  maxOutputTokens: number;
  embedSnippet: string;
}

export interface KnowledgeBaseOption {
  id: string;
  name: string;
}
