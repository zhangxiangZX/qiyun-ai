import type { WorkspaceMemberSummary } from "@/lib/auth/members";
import type { MemberRole, MockMember } from "@/lib/team/invite-mock-data";

function normalizeMemberRole(role: WorkspaceMemberSummary["role"]): MemberRole {
  if (role === "owner" || role === "admin" || role === "member" || role === "viewer") {
    return role;
  }
  return "member";
}

/** 团队列表只展示当前企业其他人员，不展示当前登录账号本人。 */
export function filterEnterpriseTeamMembers<T extends { isCurrentUser?: boolean }>(
  members: T[],
): T[] {
  return members.filter((member) => !member.isCurrentUser);
}

export function mapWorkspaceMemberToDisplay(member: WorkspaceMemberSummary): MockMember {
  const initials = member.name?.trim().slice(0, 1) || member.email.slice(0, 1).toUpperCase();
  return {
    userId: member.userId,
    name: member.name,
    email: member.email,
    role: normalizeMemberRole(member.role),
    enabled: member.status !== "disabled",
    joinedAt: member.joinedAt,
    lastLoginAt: null,
    avatarInitials: initials,
  };
}

export function mapWorkspaceMemberToTableRow(member: WorkspaceMemberSummary) {
  const roleLabel =
    member.role === "owner"
      ? "企业所有者"
      : member.role === "admin"
        ? "管理员"
        : member.role === "viewer"
          ? "只读访客"
          : "销售成员";
  return {
    userId: member.userId,
    name: member.name,
    email: member.email,
    role: roleLabel,
    department: member.role === "owner" ? "总经办" : "销售部",
    phone: "—",
    status: member.status === "disabled" ? ("离线" as const) : ("在线" as const),
    lastLogin: "—",
    tasks: 0,
  };
}

export function mapDisplayMemberToSummary(member: MockMember): WorkspaceMemberSummary {
  return {
    userId: member.userId,
    email: member.email,
    name: member.name,
    role: member.role,
    status: member.enabled ? "active" : "disabled",
    joinedAt: member.joinedAt,
    isCurrentUser: false,
  };
}
