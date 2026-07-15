import { apiRequest, getApiPrefix } from "@/lib/api/client";

export interface SelectionQuestionView {
  id: string;
  label: string;
  type: "text" | "select" | "multiselect" | "number";
  required?: boolean;
  options?: string[];
}

export interface SelectionPageView {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: "draft" | "published" | "disabled";
  createdAt: string;
  updatedAt: string;
  questionCount: number;
  requiredQuestionCount: number;
  questions: SelectionQuestionView[];
  primaryColor: string | null;
}

interface SelectionPageApiItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: "draft" | "published" | "disabled";
  createdAt: string;
  updatedAt: string;
  config?: {
    questions?: SelectionQuestionView[];
    theme?: { primaryColor?: string };
  };
}

export function mapSelectionPageApiItem(item: SelectionPageApiItem): SelectionPageView {
  const questions = item.config?.questions ?? [];
  return {
    id: item.id,
    name: item.name,
    slug: item.slug,
    description: item.description ?? null,
    status: item.status,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    questionCount: questions.length,
    requiredQuestionCount: questions.filter((question) => question.required).length,
    questions,
    primaryColor: item.config?.theme?.primaryColor ?? null,
  };
}

export async function listSelectionPages(): Promise<SelectionPageView[]> {
  const result = await apiRequest<SelectionPageApiItem[]>("/selection-pages");
  return result.map(mapSelectionPageApiItem);
}

export async function getSelectionPageById(id: string): Promise<SelectionPageView> {
  const item = await apiRequest<SelectionPageApiItem>(`/selection-pages/${encodeURIComponent(id)}`);
  return mapSelectionPageApiItem(item);
}

export async function createSelectionPage(input: {
  name: string;
  slug?: string;
  description?: string;
  status?: SelectionPageView["status"];
  questions?: SelectionQuestionView[];
  primaryColor?: string | null;
}): Promise<SelectionPageView> {
  const item = await apiRequest<SelectionPageApiItem>("/selection-pages", {
    method: "POST",
    body: {
      name: input.name,
      slug: input.slug,
      description: input.description,
      status: input.status ?? "draft",
      config: {
        questions: input.questions ?? [],
        theme: input.primaryColor ? { primaryColor: input.primaryColor } : undefined,
      },
    },
  });
  return mapSelectionPageApiItem(item);
}

export async function updateSelectionPage(
  id: string,
  input: {
    name?: string;
    slug?: string;
    description?: string | null;
    status?: SelectionPageView["status"];
    questions?: SelectionQuestionView[];
    primaryColor?: string | null;
  },
): Promise<SelectionPageView> {
  const body: Record<string, unknown> = {};
  if (input.name !== undefined) body.name = input.name;
  if (input.slug !== undefined) body.slug = input.slug;
  if (input.description !== undefined) body.description = input.description;
  if (input.status !== undefined) body.status = input.status;
  if (input.questions !== undefined || input.primaryColor !== undefined) {
    body.config = {
      ...(input.questions !== undefined ? { questions: input.questions } : {}),
      ...(input.primaryColor !== undefined ? { theme: { primaryColor: input.primaryColor } } : {}),
    };
  }
  const item = await apiRequest<SelectionPageApiItem>(`/selection-pages/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body,
  });
  return mapSelectionPageApiItem(item);
}

export async function deleteSelectionPage(id: string): Promise<void> {
  await apiRequest(`/selection-pages/${encodeURIComponent(id)}`, { method: "DELETE" });
}

/* ----------------------------------------------------------------------------
 * Selection submissions (详情 / 附件 / 分配 / 归档 / 重试转化)
 * ------------------------------------------------------------------------- */

export type SelectionSubmissionStatus = "submitted" | "converted" | "archived";

export interface SelectionSubmissionAttachment {
  id: string;
  name: string;
  sizeBytes: number;
  mimeType: string | null;
  uploadedAt: string;
}

export interface SelectionSubmission {
  id: string;
  selectionPageId: string;
  answers: Record<string, string>;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  attachmentIds: string[];
  status: SelectionSubmissionStatus;
  inquiryId: string | null;
  followTaskId: string | null;
  createdAt: string;
}

export interface SelectionSubmissionDetail extends SelectionSubmission {
  attachments: SelectionSubmissionAttachment[];
}

interface RawSubmissionRow {
  id?: string;
  selection_page_id?: string;
  selectionPageId?: string;
  answers?: Record<string, string>;
  contact_name?: string | null;
  contactName?: string | null;
  contact_phone?: string | null;
  contactPhone?: string | null;
  contact_email?: string | null;
  contactEmail?: string | null;
  attachment_ids?: string[];
  attachmentIds?: string[];
  status?: SelectionSubmissionStatus;
  inquiry_id?: string | null;
  inquiryId?: string | null;
  follow_task_id?: string | null;
  followTaskId?: string | null;
  created_at?: string;
  createdAt?: string;
}

interface RawAttachmentRow {
  id?: string;
  name?: string;
  file_name?: string;
  size_bytes?: number;
  sizeBytes?: number;
  mime_type?: string | null;
  mimeType?: string | null;
  uploaded_at?: string;
  uploadedAt?: string;
}

export const SUBMISSION_STATUS_META: Record<
  SelectionSubmissionStatus,
  { label: string; variant: "success" | "info" | "secondary" | "warning" }
> = {
  submitted: { label: "待处理", variant: "warning" },
  converted: { label: "已转化", variant: "success" },
  archived: { label: "已归档", variant: "secondary" },
};

function normalizeSubmission(row: RawSubmissionRow): SelectionSubmission {
  return {
    id: String(row.id),
    selectionPageId: String(row.selectionPageId ?? row.selection_page_id),
    answers: (row.answers ?? {}) as Record<string, string>,
    contactName: (row.contactName ?? row.contact_name ?? null) as string | null,
    contactPhone: (row.contactPhone ?? row.contact_phone ?? null) as string | null,
    contactEmail: (row.contactEmail ?? row.contact_email ?? null) as string | null,
    attachmentIds: (row.attachmentIds ?? row.attachment_ids ?? []) as string[],
    status: (row.status ?? "submitted") as SelectionSubmissionStatus,
    inquiryId: (row.inquiryId ?? row.inquiry_id ?? null) as string | null,
    followTaskId: (row.followTaskId ?? row.follow_task_id ?? null) as string | null,
    createdAt: String(row.createdAt ?? row.created_at ?? new Date().toISOString()),
  };
}

function normalizeAttachment(row: RawAttachmentRow): SelectionSubmissionAttachment {
  return {
    id: String(row.id),
    name: String(row.name ?? row.file_name ?? "文件"),
    sizeBytes: Number(row.sizeBytes ?? row.size_bytes ?? 0),
    mimeType: (row.mimeType ?? row.mime_type ?? null) as string | null,
    uploadedAt: String(row.uploadedAt ?? row.uploaded_at ?? ""),
  };
}

export function formatBytes(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(2)} MB`;
}

export async function listSelectionSubmissions(pageId: string): Promise<SelectionSubmission[]> {
  const rows = await apiRequest<RawSubmissionRow[]>(
    `/selection-pages/${encodeURIComponent(pageId)}/submissions`,
  );
  return (Array.isArray(rows) ? rows : []).map(normalizeSubmission);
}

export async function getSelectionSubmission(
  pageId: string,
  submissionId: string,
): Promise<SelectionSubmissionDetail> {
  const row = await apiRequest<RawSubmissionRow>(
    `/selection-pages/${encodeURIComponent(pageId)}/submissions/${encodeURIComponent(submissionId)}`,
  );
  const submission = normalizeSubmission(row);
  let attachments: SelectionSubmissionAttachment[] = [];
  try {
    const attachmentRows = await apiRequest<RawAttachmentRow[]>(
      `/selection-pages/${encodeURIComponent(pageId)}/submissions/${encodeURIComponent(submissionId)}/attachments`,
    );
    attachments = (Array.isArray(attachmentRows) ? attachmentRows : []).map(normalizeAttachment);
  } catch {
    attachments = [];
  }
  return { ...submission, attachments };
}

export async function listSubmissionAttachments(
  pageId: string,
  submissionId: string,
): Promise<SelectionSubmissionAttachment[]> {
  const rows = await apiRequest<RawAttachmentRow[]>(
    `/selection-pages/${encodeURIComponent(pageId)}/submissions/${encodeURIComponent(submissionId)}/attachments`,
  );
  return (Array.isArray(rows) ? rows : []).map(normalizeAttachment);
}

export async function assignSubmission(
  pageId: string,
  submissionId: string,
  ownerId: string,
): Promise<SelectionSubmission> {
  const row = await apiRequest<RawSubmissionRow>(
    `/selection-pages/${encodeURIComponent(pageId)}/submissions/${encodeURIComponent(submissionId)}/assign`,
    { method: "POST", body: { ownerId } },
  );
  return normalizeSubmission(row);
}

export async function archiveSubmission(
  pageId: string,
  submissionId: string,
): Promise<SelectionSubmission> {
  const row = await apiRequest<RawSubmissionRow>(
    `/selection-pages/${encodeURIComponent(pageId)}/submissions/${encodeURIComponent(submissionId)}/archive`,
    { method: "POST" },
  );
  return normalizeSubmission(row);
}

export async function retrySubmissionConversion(
  pageId: string,
  submissionId: string,
): Promise<SelectionSubmission> {
  const row = await apiRequest<RawSubmissionRow>(
    `/selection-pages/${encodeURIComponent(pageId)}/submissions/${encodeURIComponent(submissionId)}/retry-conversion`,
    { method: "POST" },
  );
  return normalizeSubmission(row);
}

export function downloadSubmissionAttachment(attachmentId: string, fallbackName = "attachment"): void {
  const url = `${getApiPrefix()}/files/${encodeURIComponent(attachmentId)}/download`;
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fallbackName;
  anchor.click();
}

/* ----------------------------------------------------------------------------
 * Preview-mode mock submissions
 * ------------------------------------------------------------------------- */

const MOCK_SUBMISSION_LABELS = [
  "使用场景",
  "防护等级",
  "设备数量",
  "预算范围",
  "现场网络环境",
  "期望交付周期",
  "联系人姓名",
  "联系人电话",
];

function seededInt(seed: number, mod: number): number {
  const x = Math.sin(seed * 99991) * 10000;
  return Math.floor((x - Math.floor(x)) * mod);
}

export function buildMockSubmissions(pageId: string, count = 8): SelectionSubmission[] {
  const seedBase = pageId.split("").reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  const now = Date.now();
  const scenarios = [
    { name: "张伟", phone: "13800001111", email: "zhangwei@factory.com", base: 0 },
    { name: "李娜", phone: "13900002222", email: "lina@cnc-mfg.cn", base: 1 },
    { name: "王强", phone: "13700003333", email: "wangq@robot-io.com", base: 2 },
    { name: "陈静", phone: "13600004444", email: "chenjing@laser.cn", base: 3 },
    { name: "刘洋", phone: "13500005555", email: "liuyang@auto-line.com", base: 4 },
  ];
  const statuses: SelectionSubmissionStatus[] = ["submitted", "submitted", "converted", "archived", "submitted"];
  return Array.from({ length: count }).map((_, index) => {
    const scenario = scenarios[seededInt(seedBase + index, scenarios.length)];
    const status = statuses[seededInt(seedBase + index * 3, statuses.length)];
    const hasInquiry = status === "converted";
    const answers: Record<string, string> = {};
    MOCK_SUBMISSION_LABELS.slice(0, 6).forEach((label, li) => {
      const pick = seededInt(seedBase + index * 7 + li, 5);
      const values = [
        "户外防护",
        "IP65",
        "12 台",
        "50-80 万",
        "有线 + 5G 备份",
        "30 天内",
      ];
      answers[label] = values[(pick + li) % values.length];
    });
    const attachmentCount = seededInt(seedBase + index, 3);
    const attachmentIds = Array.from({ length: attachmentCount }).map(
      (_, ai) => `att-mock-${seedBase}-${index}-${ai}`,
    );
    return {
      id: `ss-mock-${seedBase}-${index}`,
      selectionPageId: pageId,
      answers,
      contactName: scenario.name,
      contactPhone: scenario.phone,
      contactEmail: scenario.email,
      attachmentIds,
      status,
      inquiryId: hasInquiry ? `inq-mock-${seedBase}-${index}` : null,
      followTaskId: hasInquiry ? `ft-mock-${seedBase}-${index}` : null,
      createdAt: new Date(now - (index + 1) * 3600 * 1000 * (1 + seededInt(seedBase + index, 6))).toISOString(),
    };
  });
}

export function buildMockSubmissionDetail(
  pageId: string,
  submissionId: string,
): SelectionSubmissionDetail {
  const list = buildMockSubmissions(pageId);
  const base = list.find((entry) => entry.id === submissionId) ?? list[0];
  if (!base) {
    return {
      id: submissionId,
      selectionPageId: pageId,
      answers: {},
      contactName: null,
      contactPhone: null,
      contactEmail: null,
      attachmentIds: [],
      status: "submitted",
      inquiryId: null,
      followTaskId: null,
      createdAt: new Date().toISOString(),
      attachments: [],
    };
  }
  const attachments: SelectionSubmissionAttachment[] = base.attachmentIds.map((id, ai) => ({
    id,
    name: `选型附件_${ai + 1}.pdf`,
    sizeBytes: 120000 + ai * 40000,
    mimeType: "application/pdf",
    uploadedAt: base.createdAt,
  }));
  return { ...base, attachments };
}
