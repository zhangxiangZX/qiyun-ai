/* -------------------------------------------------------------------------- */
/*  Invite Member — Mock Data                                                  */
/*  供 useApiResource("/auth/workspace-members", ...) 在 PREVIEW_MODE 时回退    */
/* -------------------------------------------------------------------------- */

export type MemberRole = "owner" | "admin" | "member" | "viewer";

export interface MockMember {
  userId: string;
  name: string;
  email: string;
  role: MemberRole;
  enabled: boolean;
  joinedAt: string;
  lastLoginAt: string | null;
  avatarInitials: string;
}

export interface MockInvitation {
  id: string;
  email: string;
  role: "admin" | "member" | "viewer";
  status: "pending" | "accepted" | "expired";
  invitedAt: string;
  expiresAt: string;
}

export const mockMembers: MockMember[] = [
  {
    userId: "u-001",
    name: "张伟",
    email: "zhangwei@qiyun.com",
    role: "owner",
    enabled: true,
    joinedAt: "2024-01-15T08:30:00Z",
    lastLoginAt: "2025-06-01T09:30:00Z",
    avatarInitials: "张",
  },
  {
    userId: "u-002",
    name: "李娜",
    email: "lina@qiyun.com",
    role: "admin",
    enabled: true,
    joinedAt: "2024-02-20T10:00:00Z",
    lastLoginAt: "2025-06-01T09:15:00Z",
    avatarInitials: "李",
  },
  {
    userId: "u-003",
    name: "王磊",
    email: "wanglei@qiyun.com",
    role: "member",
    enabled: true,
    joinedAt: "2024-03-10T14:20:00Z",
    lastLoginAt: "2025-05-31T18:40:00Z",
    avatarInitials: "王",
  },
  {
    userId: "u-004",
    name: "陈晨",
    email: "chenchen@qiyun.com",
    role: "member",
    enabled: false,
    joinedAt: "2024-04-05T09:00:00Z",
    lastLoginAt: "2025-05-20T11:22:00Z",
    avatarInitials: "陈",
  },
  {
    userId: "u-005",
    name: "赵宇",
    email: "zhaoyu@qiyun.com",
    role: "admin",
    enabled: true,
    joinedAt: "2024-05-18T16:45:00Z",
    lastLoginAt: "2025-06-01T08:50:00Z",
    avatarInitials: "赵",
  },
  {
    userId: "u-006",
    name: "周婷",
    email: "zhouting@qiyun.com",
    role: "member",
    enabled: true,
    joinedAt: "2024-06-22T11:30:00Z",
    lastLoginAt: "2025-05-30T16:10:00Z",
    avatarInitials: "周",
  },
  {
    userId: "u-007",
    name: "孙锐",
    email: "sunrui@qiyun.com",
    role: "member",
    enabled: true,
    joinedAt: "2024-08-14T08:15:00Z",
    lastLoginAt: "2025-06-01T09:10:00Z",
    avatarInitials: "孙",
  },
  {
    userId: "u-008",
    name: "林琳",
    email: "linlin@qiyun.com",
    role: "member",
    enabled: false,
    joinedAt: "2024-09-01T13:00:00Z",
    lastLoginAt: "2025-04-28T14:32:00Z",
    avatarInitials: "林",
  },
];

export const mockInvitations: MockInvitation[] = [
  {
    id: "inv-001",
    email: "guotao@qiyun.com",
    role: "member",
    status: "pending",
    invitedAt: "2025-06-01T09:30:00Z",
    expiresAt: "2025-06-08T09:30:00Z",
  },
  {
    id: "inv-002",
    email: "huyuan@qiyun.com",
    role: "member",
    status: "pending",
    invitedAt: "2025-06-01T08:15:00Z",
    expiresAt: "2025-06-08T08:15:00Z",
  },
  {
    id: "inv-003",
    email: "liuxia@qiyun.com",
    role: "admin",
    status: "accepted",
    invitedAt: "2025-05-28T10:00:00Z",
    expiresAt: "2025-06-04T10:00:00Z",
  },
  {
    id: "inv-004",
    email: "zhengwei@partner.cn",
    role: "member",
    status: "expired",
    invitedAt: "2025-05-20T14:30:00Z",
    expiresAt: "2025-05-27T14:30:00Z",
  },
  {
    id: "inv-005",
    email: "huangmin@qiyun.com",
    role: "member",
    status: "pending",
    invitedAt: "2025-05-31T16:45:00Z",
    expiresAt: "2025-06-07T16:45:00Z",
  },
];

/** Simple email format validation */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/** Format date for display */
export function formatInviteDate(value: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
