import { apiRequest } from "@/lib/api/client";

export interface FollowTaskEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  kind: "follow_up" | "demo" | "meeting" | "call" | "reminder";
  status: "pending" | "done" | "cancelled";
  leadId?: string;
  leadName?: string;
  ownerName?: string;
  note?: string;
}

type FollowTaskWire = FollowTaskEvent & {
  due_at?: string;
  inquiry_id?: string | null;
  assignee_user_id?: string | null;
  priority?: string;
  completion_result?: string | null;
};

function normalizeTask(item: FollowTaskWire): FollowTaskEvent {
  if (item.start) return item;
  const dueAt = item.due_at ?? new Date().toISOString();
  return {
    id: item.id, title: item.title, start: dueAt, end: dueAt, kind: "follow_up",
    status: item.status === "done" || item.status === "cancelled" ? item.status : "pending",
    leadId: item.inquiry_id ?? undefined,
    ownerName: item.assignee_user_id ?? undefined,
    note: [item.priority ? `优先级:${item.priority}` : "", item.completion_result ?? ""].filter(Boolean).join("\n"),
  };
}

export async function listFollowTasks(query?: {
  from?: string;
  to?: string;
  status?: "pending" | "done" | "cancelled";
  inquiryId?: string;
}): Promise<FollowTaskEvent[]> {
  const params = new URLSearchParams();
  if (query?.from) params.set("from", query.from);
  if (query?.to) params.set("to", query.to);
  if (query?.status) params.set("status", query.status);
  if (query?.inquiryId) params.set("inquiryId", query.inquiryId);
  const suffix = params.toString() ? `?${params.toString()}` : "";
  return (await apiRequest<FollowTaskWire[]>(`/follow-tasks${suffix}`)).map(normalizeTask);
}

export async function createFollowTask(input: {
  title: string;
  dueAt: string;
  inquiryId?: string;
  customerName?: string;
  ownerName?: string;
  note?: string;
  priority?: "low" | "medium" | "high";
}): Promise<FollowTaskEvent> {
  const created = normalizeTask(
    await apiRequest<FollowTaskWire>("/follow-tasks", {
      method: "POST",
      body: input,
    }),
  );
  // Postgres POST previously hardcoded medium; still PATCH as safety if POST ignored priority.
  if (input.priority) {
    try {
      await patchFollowTask(created.id, { priority: input.priority });
    } catch {
      // Keep created task; note still carries human-readable priority.
    }
  }
  return created;
}

export async function followTaskAction(
  id: string,
  action: "complete" | "delay" | "cancel",
  body?: { dueAt?: string; note?: string },
): Promise<FollowTaskEvent> {
  return normalizeTask(await apiRequest<FollowTaskWire>(`/follow-tasks/${encodeURIComponent(id)}/${action}`, {
    method: "POST",
    body: body ?? {},
  }));
}

/* ----------------------------------------------------------------------------
 * Follow task detail (负责人 / 优先级 / 延期原因 / 完成结果)
 * ------------------------------------------------------------------------- */

export interface FollowTaskDetail {
  id: string;
  title: string;
  dueAt: string;
  status: "pending" | "done" | "cancelled";
  inquiryId: string | null;
  assigneeUserId: string | null;
  priority: "low" | "medium" | "high";
  delayReason: string | null;
  completionResult: string | null;
  completedAt: string | null;
  cancelReason: string | null;
  note: string | null;
  customerName: string | null;
}

interface RawFollowTaskRow {
  id?: string;
  title?: string;
  due_at?: string;
  dueAt?: string;
  status?: string;
  inquiry_id?: string | null;
  inquiryId?: string | null;
  assignee_user_id?: string | null;
  assigneeUserId?: string | null;
  priority?: string;
  delay_reason?: string | null;
  delayReason?: string | null;
  completion_result?: string | null;
  completionResult?: string | null;
  completed_at?: string | null;
  completedAt?: string | null;
  cancel_reason?: string | null;
  cancelReason?: string | null;
  note?: string | null;
  lead_name?: string | null;
  leadName?: string | null;
  customer_name?: string | null;
  customerName?: string | null;
}

export function normalizeFollowTaskDetail(row: RawFollowTaskRow): FollowTaskDetail {
  return {
    id: String(row.id),
    title: String(row.title ?? ""),
    dueAt: String(row.dueAt ?? row.due_at ?? new Date().toISOString()),
    status: (row.status === "done" || row.status === "cancelled" ? row.status : "pending") as FollowTaskDetail["status"],
    inquiryId: (row.inquiryId ?? row.inquiry_id ?? null) as string | null,
    assigneeUserId: (row.assigneeUserId ?? row.assignee_user_id ?? null) as string | null,
    priority: (row.priority === "low" || row.priority === "high" ? row.priority : "medium") as FollowTaskDetail["priority"],
    delayReason: (row.delayReason ?? row.delay_reason ?? null) as string | null,
    completionResult: (row.completionResult ?? row.completion_result ?? null) as string | null,
    completedAt: (row.completedAt ?? row.completed_at ?? null) as string | null,
    cancelReason: (row.cancelReason ?? row.cancel_reason ?? null) as string | null,
    note: (row.note ?? null) as string | null,
    customerName: (row.customerName ?? row.customer_name ?? row.leadName ?? row.lead_name ?? null) as string | null,
  };
}

export async function getFollowTask(id: string): Promise<FollowTaskDetail> {
  const row = await apiRequest<RawFollowTaskRow>(`/follow-tasks/${encodeURIComponent(id)}`);
  return normalizeFollowTaskDetail(row);
}

export interface PatchFollowTaskInput {
  title?: string;
  dueAt?: string;
  priority?: "low" | "medium" | "high";
  assigneeUserId?: string | null;
}

export async function patchFollowTask(id: string, patch: PatchFollowTaskInput): Promise<FollowTaskDetail> {
  const row = await apiRequest<RawFollowTaskRow>(`/follow-tasks/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: patch,
  });
  return normalizeFollowTaskDetail(row);
}
