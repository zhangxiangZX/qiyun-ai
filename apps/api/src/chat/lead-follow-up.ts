import { randomUUID } from "node:crypto";

import type { LeadFollowUpRecord, LeadStatus } from "./chat.types";

export function leadStatusLabel(status: LeadStatus): string {
  switch (status) {
    case "new":
      return "新线索";
    case "pending":
      return "待跟进";
    case "contacted":
      return "已联系";
    case "proposal":
      return "方案中";
    case "won":
      return "已成交";
    case "invalid":
      return "无效";
    default:
      return status;
  }
}

export function createLeadCreatedFollowUp(leadId: string, createdAt: string): LeadFollowUpRecord {
  return {
    id: `follow-created-${leadId}`,
    kind: "system",
    title: "线索已创建",
    body: "访客通过公开聊天提交了联系方式。",
    createdAt,
  };
}

export function createInitialLeadFollowUpRecords(
  leadId: string,
  createdAt: string,
  status: LeadStatus = "new",
): LeadFollowUpRecord[] {
  return [
    createLeadCreatedFollowUp(leadId, createdAt),
    {
      id: `follow-status-${leadId}`,
      kind: "status",
      title: `状态：${leadStatusLabel(status)}`,
      createdAt,
    },
  ];
}

export function appendLeadFollowUpRecords(
  existing: LeadFollowUpRecord[] | undefined,
  incoming: LeadFollowUpRecord[],
): LeadFollowUpRecord[] {
  if (incoming.length === 0) {
    return existing ?? [];
  }
  return [...incoming, ...(existing ?? [])].sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
}

export function buildLeadMetaFollowUpChanges(input: {
  leadId: string;
  previous: {
    status?: LeadStatus;
    assignee?: string | null;
    notes?: string;
  } | null;
  next: {
    status: LeadStatus;
    assignee: string | null;
    notes: string;
  };
  updatedAt: string;
  actor?: string | null;
}): LeadFollowUpRecord[] {
  const records: LeadFollowUpRecord[] = [];
  const previousStatus = input.previous?.status ?? "new";
  const previousAssignee = input.previous?.assignee ?? null;
  const previousNotes = input.previous?.notes?.trim() ?? "";

  if (input.next.status !== previousStatus) {
    records.push({
      id: `follow-status-${randomUUID()}`,
      kind: "status",
      title: `状态：${leadStatusLabel(input.next.status)}`,
      body: `由 ${leadStatusLabel(previousStatus)} 更新为 ${leadStatusLabel(input.next.status)}`,
      actor: input.actor ?? "workspace",
      createdAt: input.updatedAt,
    });
  }

  if (input.next.assignee !== previousAssignee) {
    records.push({
      id: `follow-assignee-${randomUUID()}`,
      kind: "assignee",
      title: input.next.assignee
        ? `负责人：${input.next.assignee}`
        : "负责人已清空",
      actor: input.actor ?? "workspace",
      createdAt: input.updatedAt,
    });
  }

  const nextNotes = input.next.notes.trim();
  if (nextNotes && nextNotes !== previousNotes) {
    records.push({
      id: `follow-note-${randomUUID()}`,
      kind: "note",
      title: "跟进备注",
      body: nextNotes,
      actor: input.next.assignee ?? input.actor ?? "workspace",
      createdAt: input.updatedAt,
    });
  }

  return records;
}
