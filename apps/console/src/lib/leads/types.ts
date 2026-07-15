export type LeadStatus =
  | "new"
  | "pending"
  | "contacted"
  | "proposal"
  | "won"
  | "invalid";

export interface LeadListItem {
  id: string;
  name: string;
  contact: string;
  sourceBotId: string;
  sourceBot: string;
  lastQuestion: string;
  summary?: string | null;
  sourceSiteId?: string | null;
  sourceSiteName?: string | null;
  status: LeadStatus;
  assignee: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LeadAttachment {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
  downloadUrl?: string;
  status?: "ready" | "pending" | "failed";
  errorMessage?: string;
}

export interface LeadFollowUpRecord {
  id: string;
  kind: "note" | "status" | "assignee" | "system";
  title: string;
  body?: string;
  actor?: string | null;
  createdAt: string;
}

export interface LeadDetail extends LeadListItem {
  conversationId: string | null;
  email?: string;
  phone?: string;
  company?: string;
  requirement?: string;
  drawingAttachment?: string;
  summary?: string | null;
  sourceSiteId?: string | null;
  sourceSiteName?: string | null;
  notes: string;
  attachments?: LeadAttachment[];
  followUpRecords?: LeadFollowUpRecord[];
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
