export type LeadStatus = "new" | "following" | "won" | "invalid";

export interface LeadListItem {
  id: string;
  name: string;
  contact: string;
  sourceBotId: string;
  sourceBot: string;
  lastQuestion: string;
  status: LeadStatus;
  assignee: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LeadDetail extends LeadListItem {
  conversationId: string | null;
  email?: string;
  phone?: string;
  company?: string;
  notes: string;
}

export interface LeadFilters {
  query: string;
  status: LeadStatus | "all";
  botId: string;
  assignee: string;
}

export interface BotFilterOption {
  id: string;
  name: string;
}
