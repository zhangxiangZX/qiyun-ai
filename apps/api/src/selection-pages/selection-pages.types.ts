export interface SelectionPageRecord {
  id: string;
  workspaceId: string;
  name: string;
  slug: string;
  description: string | null;
  config: SelectionPageConfig;
  status: "draft" | "published" | "disabled";
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface SelectionPageConfig {
  questions?: SelectionQuestion[];
  theme?: { primaryColor?: string };
  botId?: string;
  siteKey?: string;
  publicConfig?: Record<string, unknown>;
}

export interface SelectionQuestion {
  id: string;
  label: string;
  type: "text" | "select" | "multiselect" | "number";
  required?: boolean;
  options?: string[];
}

export interface SelectionSubmissionRecord {
  id: string;
  selectionPageId: string;
  answers: Record<string, string>;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  attachmentIds: string[];
  status: "submitted" | "converted" | "archived";
  inquiryId: string | null;
  followTaskId: string | null;
  createdAt: string;
}
