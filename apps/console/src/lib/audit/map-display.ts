import type { AuditLogDisplayRow } from "@/lib/audit/audit-dashboard-mock";
import {
  getAuditActionLabel,
  getAuditModuleLabel,
  type AuditEntry,
} from "@/lib/audit/types";
import type { WorkspaceMemberSummary } from "@/lib/auth/members";

const ROLE_LABELS: Record<string, string> = {
  owner: "所有者",
  admin: "管理员",
  member: "成员",
  viewer: "只读成员",
};

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

function resolveUser(
  userId: string | null,
  members: Map<string, WorkspaceMemberSummary>,
): { name: string; role: string; avatar: string } {
  if (!userId) {
    return { name: "系统", role: "—", avatar: "系" };
  }
  const member = members.get(userId);
  if (member) {
    return {
      name: member.name || member.email,
      role: ROLE_LABELS[member.role] ?? member.role,
      avatar: (member.name || member.email).slice(0, 1),
    };
  }
  const shortId = userId.replace(/^user_/, "").slice(0, 8);
  return { name: shortId, role: "—", avatar: shortId.slice(0, 1).toUpperCase() };
}

export function mapAuditEntryToDisplayRow(
  entry: AuditEntry,
  members: WorkspaceMemberSummary[],
): AuditLogDisplayRow {
  const memberMap = new Map(members.map((member) => [member.userId, member]));
  const user = resolveUser(entry.userId, memberMap);
  const moduleLabel = entry.moduleLabel ?? getAuditModuleLabel(entry.module);
  const actionLabel = entry.actionLabel ?? getAuditActionLabel(entry.action);
  const content =
    entry.summary ??
    `${moduleLabel} · ${actionLabel}${entry.targetId ? `（${entry.targetId}）` : ""}`;

  return {
    id: entry.id,
    time: formatDateTime(entry.createdAt),
    userName: user.name,
    userAvatar: user.avatar,
    userRole: user.role,
    module: moduleLabel,
    actionType: actionLabel,
    content,
    result: "success",
    ip: entry.ip ?? "—",
    remark: entry.targetId ? `目标 ID：${entry.targetId}` : undefined,
  };
}

export function computeAuditStats(entries: AuditEntry[]) {
  const userIds = new Set(entries.map((entry) => entry.userId).filter(Boolean));
  return {
    total: { value: entries.length, trend: "", up: true },
    success: { value: entries.length, trend: "", up: true },
    failure: { value: 0, trend: "", up: false },
    activeUsers: { value: userIds.size, trend: "", up: true },
  };
}
