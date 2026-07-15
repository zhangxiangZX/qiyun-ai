import type { WorkspaceMemberSummary } from "@/lib/auth/members";
import type { WorkspaceMemberRole } from "@/lib/team/role-types";
import {
  PERMISSION_ACTIONS,
  PERMISSION_MODULES,
  type PermissionAction,
  type RoleItem,
} from "@/lib/team/roles-mock-data";

export type PermissionState = "full" | "partial" | "none" | "na";
export type RolePermissionMap = Record<string, Partial<Record<PermissionAction, PermissionState>>>;

const FULL: Record<PermissionAction, PermissionState> = {
  view: "full",
  create: "full",
  edit: "full",
  delete: "full",
  export: "full",
  import: "full",
  setup: "full",
};

const WRITE_SALES: Record<PermissionAction, PermissionState> = {
  view: "full",
  create: "full",
  edit: "full",
  delete: "none",
  export: "partial",
  import: "none",
  setup: "na",
};

const VIEW_ONLY: Record<PermissionAction, PermissionState> = {
  view: "full",
  create: "none",
  edit: "none",
  delete: "none",
  export: "none",
  import: "none",
  setup: "none",
};

const VIEW_ANALYTICS: Record<PermissionAction, PermissionState> = {
  view: "full",
  create: "none",
  edit: "none",
  delete: "none",
  export: "partial",
  import: "none",
  setup: "na",
};

const MANAGER_SETUP: Record<PermissionAction, PermissionState> = {
  view: "full",
  create: "full",
  edit: "full",
  delete: "full",
  export: "full",
  import: "full",
  setup: "full",
};

const NONE: Record<PermissionAction, PermissionState> = {
  view: "none",
  create: "none",
  edit: "none",
  delete: "none",
  export: "none",
  import: "none",
  setup: "none",
};

export const PLATFORM_ROLES: Array<{
  id: WorkspaceMemberRole;
  name: string;
  code: WorkspaceMemberRole;
  description: string;
  icon: string;
  iconBg: string;
}> = [
  {
    id: "owner",
    name: "企业所有者",
    code: "owner",
    description: "拥有工作区全部功能，可转移所有权与管理团队成员",
    icon: "👑",
    iconBg: "#fee2e2",
  },
  {
    id: "admin",
    name: "管理员",
    code: "admin",
    description: "管理机器人、知识库、渠道配置与团队成员，可处理全部询盘",
    icon: "🛡️",
    iconBg: "#dbeafe",
  },
  {
    id: "member",
    name: "销售成员",
    code: "member",
    description: "跟进询盘、报价与日历任务；销售数据默认仅看自己负责范围",
    icon: "🎯",
    iconBg: "#ffedd5",
  },
  {
    id: "viewer",
    name: "只读访客",
    code: "viewer",
    description: "仅可查看授权范围内的业务数据，不可新增或修改",
    icon: "👁️",
    iconBg: "#f1f5f9",
  },
];

/** V1 平台角色权限矩阵（只读说明，与后端 RBAC 约定一致） */
export function getRolePermissions(roleId: WorkspaceMemberRole): RolePermissionMap {
  if (roleId === "owner" || roleId === "admin") {
    return Object.fromEntries(PERMISSION_MODULES.flatMap((module) => [[module.id, FULL]]));
  }

  if (roleId === "member") {
    return {
      customer: WRITE_SALES,
      customer_list: WRITE_SALES,
      customer_detail: WRITE_SALES,
      inquiry: WRITE_SALES,
      inquiry_list: WRITE_SALES,
      inquiry_assign: { ...WRITE_SALES, edit: "partial", setup: "na" },
      quote: WRITE_SALES,
      quote_list: WRITE_SALES,
      quote_template: { ...VIEW_ONLY, view: "partial" },
      quote_approve: { ...VIEW_ONLY, view: "partial" },
      analytics: VIEW_ANALYTICS,
      analytics_funnel: VIEW_ANALYTICS,
      analytics_channel: VIEW_ANALYTICS,
      analytics_export: { ...VIEW_ANALYTICS, export: "partial" },
      settings: NONE,
      settings_team: NONE,
      settings_roles: NONE,
      settings_logs: { ...VIEW_ONLY, view: "partial" },
    };
  }

  return Object.fromEntries(
    PERMISSION_MODULES.flatMap((module) => [
      [module.id, VIEW_ONLY],
      ...(module.children?.map((child) => [child.id, VIEW_ONLY]) ?? []),
    ]),
  );
}

export function buildPlatformRoles(members: WorkspaceMemberSummary[]): RoleItem[] {
  const counts = members.reduce<Record<string, number>>((acc, member) => {
    acc[member.role] = (acc[member.role] ?? 0) + 1;
    return acc;
  }, {});

  return PLATFORM_ROLES.map((role) => ({
    id: role.id,
    name: role.name,
    code: role.code,
    description: role.description,
    memberCount: counts[role.id] ?? 0,
    icon: role.icon,
    iconBg: role.iconBg,
  }));
}

export function listRoleMembers(
  members: WorkspaceMemberSummary[],
  roleId: WorkspaceMemberRole,
): Array<{ name: string; avatar: string; userId: string }> {
  return members
    .filter((member) => member.role === roleId)
    .map((member) => ({
      userId: member.userId,
      name: member.name || member.email,
      avatar: (member.name || member.email).trim().slice(0, 1) || "?",
    }));
}

export function formatRoleUpdatedAt(members: WorkspaceMemberSummary[], roleId: WorkspaceMemberRole): string {
  const joined = members
    .filter((member) => member.role === roleId)
    .map((member) => Date.parse(member.joinedAt))
    .filter((value) => Number.isFinite(value));
  if (!joined.length) return "—";
  const latest = new Date(Math.max(...joined));
  return latest.toLocaleDateString("zh-CN");
}

/** 权限码 = `${moduleId}.${action}`，与后端 role_permissions 表存储的扁平码一致 */
export function permissionCode(moduleId: string, action: PermissionAction): string {
  return `${moduleId}.${action}`;
}

/** 把后端扁平权限码解析为前端矩阵；无法识别（如旧粗粒度默认码）或为空时返回 null */
export function parsePermissionsToMap(codes: string[] | undefined): RolePermissionMap | null {
  if (!codes || codes.length === 0) return null;
  const actionSet = new Set<string>(PERMISSION_ACTIONS);
  const map: RolePermissionMap = {};
  let matched = false;
  for (const code of codes) {
    const dot = code.lastIndexOf(".");
    if (dot <= 0) continue;
    const moduleId = code.slice(0, dot);
    const action = code.slice(dot + 1);
    if (!actionSet.has(action)) continue;
    if (!map[moduleId]) map[moduleId] = {};
    map[moduleId][action as PermissionAction] = "full";
    matched = true;
  }
  return matched ? map : null;
}

/** 把编辑草稿矩阵转换为后端扁平权限码（只收集 full 态） */
export function mapToPermissionCodes(map: RolePermissionMap): string[] {
  const codes: string[] = [];
  for (const moduleId of Object.keys(map)) {
    const actions = map[moduleId];
    for (const action of PERMISSION_ACTIONS) {
      if (actions[action] === "full") codes.push(`${moduleId}.${action}`);
    }
  }
  return codes;
}
