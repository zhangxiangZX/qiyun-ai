import type { MemberRole } from "@/lib/team/invite-mock-data";

export type InviteRole = "admin" | "member" | "viewer";

export const INVITE_ROLE_OPTIONS: Array<{
  value: InviteRole;
  label: string;
  description: string;
}> = [
  {
    value: "member",
    label: "销售成员",
    description: "跟进询盘、报价与日历任务，销售数据默认仅看自己负责范围",
  },
  {
    value: "admin",
    label: "管理员",
    description: "管理机器人、知识库、渠道与团队成员，可查看全部业务数据",
  },
  {
    value: "viewer",
    label: "只读访客",
    description: "仅可查看授权范围内的数据，不可新增或修改",
  },
];

export const DATA_SCOPE_OPTIONS = [
  {
    id: "all",
    label: "可查看所有客户",
    description: "可访问团队全部客户、询盘与报表数据",
    roles: ["admin"] as InviteRole[],
    tone: "blue" as const,
  },
  {
    id: "self",
    label: "仅自己客户",
    description: "仅可访问自己负责或分配的询盘与客户数据",
    roles: ["member"] as InviteRole[],
    tone: "green" as const,
  },
  {
    id: "readonly",
    label: "仅部门客户",
    description: "只读查看本部门授权范围内业务数据",
    roles: ["viewer"] as InviteRole[],
    tone: "orange" as const,
  },
] as const;

export const DEPARTMENT_OPTIONS = [
  "销售一部",
  "销售二部",
  "市场部",
  "客户成功部",
  "数据部",
  "行政人事部",
] as const;

export function roleLabel(role: string): string {
  if (role === "owner") return "企业所有者";
  if (role === "admin") return "管理员";
  if (role === "member") return "销售成员";
  if (role === "viewer") return "只读访客";
  return role;
}

export function dataScopeForRole(role: InviteRole | MemberRole): string {
  if (role === "admin" || role === "owner") return "可查看所有客户";
  if (role === "viewer") return "仅部门客户";
  return "仅自己客户";
}

export function permissionSummaryForRole(role: InviteRole | MemberRole): string[] {
  if (role === "admin" || role === "owner") {
    return ["管理团队成员与配置", "查看全部客户、询盘与报表", "创建与编辑业务数据"];
  }
  if (role === "viewer") {
    return ["查看客户、询盘与报表", "不可创建或编辑数据", "不可管理团队成员"];
  }
  return ["跟进自己负责的询盘与报价", "创建跟进任务与备注", "导出部分报表"];
}

export function accessRangeForRole(role: InviteRole | MemberRole): string {
  if (role === "admin" || role === "owner") {
    return "全部客户、询盘、跟进记录、报表";
  }
  if (role === "viewer") {
    return "授权范围内的客户、询盘、报表（只读）";
  }
  return "自己负责的客户、询盘、跟进记录";
}

export function otherPermissionsForRole(role: InviteRole | MemberRole): string {
  if (role === "admin" || role === "owner") {
    return "管理团队、配置机器人与知识库、导出报表";
  }
  if (role === "viewer") {
    return "仅查看，无编辑权限";
  }
  return "创建跟进、添加备注、导出报表";
}

export function roleShortLabel(role: InviteRole | MemberRole | string): string {
  if (role === "admin") return "管理员";
  if (role === "member") return "销售";
  if (role === "viewer") return "只读";
  if (role === "owner") return "老板";
  return roleLabel(role);
}

export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 7) return phone || "—";
  return `${digits.slice(0, 3)} **** ${digits.slice(-4)}`;
}

export function formatInviteExpiry(expiresAt: string): string {
  const date = new Date(expiresAt);
  if (Number.isNaN(date.getTime())) return "—";
  const formatted = date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  return `邀请有效期 ${formatted.replace(/\//g, "-")}（${inviteExpiresLabel(expiresAt)}）`;
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  if (local.length <= 2) return `${local[0] ?? ""}***@${domain}`;
  return `${local.slice(0, 1)}***${local.slice(-1)}@${domain}`;
}

export function inviteExpiresLabel(expiresAt: string): string {
  const diffMs = Date.parse(expiresAt) - Date.now();
  if (!Number.isFinite(diffMs)) return "—";
  const days = Math.max(0, Math.ceil(diffMs / 86_400_000));
  return days > 0 ? `剩余 ${days} 天` : "已过期";
}
