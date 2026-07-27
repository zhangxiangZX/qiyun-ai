import { unwrapEnvelope } from "@/lib/api/envelope";

export interface CustomerWorkspaceItem {
  id: string;
  name: string;
  slug: string;
  website: string | null;
  plan: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  createdAt: string;
  pendingAdminInvite: {
    email: string;
    status: string;
    inviteUrl: string;
    expiresAt: string;
  } | null;
}

export interface ProvisionWorkspaceInput {
  companyName: string;
  website?: string;
  plan: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  adminEmail: string;
}

export interface ProvisionWorkspaceResult {
  workspace: CustomerWorkspaceItem;
  invitation: {
    email: string;
    inviteUrl: string;
    status: string;
  };
}

export interface TrialRequestItem {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string | null;
  website: string | null;
  requirement: string | null;
  requestedPlan: string | null;
  status: "pending" | "approved" | "rejected";
  submittedAt: string;
  reviewedAt: string | null;
  reviewNotes: string | null;
  processedBy: {
    userId: string;
    name: string;
    email: string;
  } | null;
  approvedWorkspace: {
    id: string;
    name: string;
    inviteEmail: string | null;
    inviteStatus: string | null;
    inviteUrl: string | null;
  } | null;
}

export interface ReviewTrialRequestInput {
  action: "approve" | "reject";
  plan?: string;
  adminEmail?: string;
  reviewNotes?: string;
}

async function parseError(response: Response, fallback: string) {
  const payload = (await response.json().catch(() => null)) as { message?: string } | null;
  throw new Error(payload?.message || fallback);
}

export async function listCustomerWorkspaces(): Promise<CustomerWorkspaceItem[]> {
  const response = await fetch("/api/platform/workspaces", { cache: "no-store" });
  if (!response.ok) {
    await parseError(response, "加载客户工作区失败。");
  }
  return unwrapEnvelope<CustomerWorkspaceItem[]>(await response.json());
}

export async function provisionCustomerWorkspace(
  input: ProvisionWorkspaceInput,
): Promise<ProvisionWorkspaceResult> {
  const response = await fetch("/api/platform/workspaces", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    await parseError(response, "创建工作区失败。");
  }
  return unwrapEnvelope<ProvisionWorkspaceResult>(await response.json());
}

export async function listTrialRequests(): Promise<TrialRequestItem[]> {
  const response = await fetch("/api/platform/trial-requests", { cache: "no-store" });
  if (!response.ok) {
    await parseError(response, "加载试用申请失败。");
  }
  return unwrapEnvelope<TrialRequestItem[]>(await response.json());
}

export async function reviewTrialRequest(
  trialRequestId: string,
  input: ReviewTrialRequestInput,
): Promise<TrialRequestItem> {
  const response = await fetch(`/api/platform/trial-requests/${trialRequestId}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    await parseError(response, "处理试用申请失败。");
  }
  return unwrapEnvelope<TrialRequestItem>(await response.json());
}
