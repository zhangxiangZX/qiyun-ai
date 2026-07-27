/**
 * `member` is the persisted MVP role for sales users.
 * API inputs may also accept `sales_member` as an alias.
 */
export type WorkspaceMemberRole = "owner" | "admin" | "member" | "viewer";
export type WorkspaceInvitationRole = "admin" | "member" | "viewer";

export interface UserAccountProfile {
  phone?: string;
  jobTitle?: string;
  bio?: string;
  department?: string;
  language?: "zh" | "en";
  /** data URL 或可访问的头像地址 */
  avatarUrl?: string;
  notificationPrefs?: {
    system?: boolean;
    leads?: boolean;
    quoteStatus?: boolean;
    marketing?: boolean;
  };
}

export interface AccountSettingsPayload {
  id: string;
  nickname: string;
  phone: string;
  email: string;
  jobTitle: string;
  bio: string;
  department: string;
  role: string;
  lastLogin: string;
  loginIp: string;
  avatarUrl: string;
  notificationPrefs: {
    system: boolean;
    leads: boolean;
    quoteStatus: boolean;
    marketing: boolean;
  };
  language: "zh" | "en";
}

export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  status: "active" | "disabled";
  activeWorkspaceId: string | null;
  platformRole: "platform_admin" | null;
  /** 强制改密标记：为 true 时用户首次登录后必须修改密码才能进入控制台 */
  mustChangePassword?: boolean;
  accountProfile?: UserAccountProfile;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceRecord {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  website: string | null;
  plan: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  provisionedByUserId: string | null;
  companyProfile?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * 企业资料可写字段（对应前端 company-profile 表单）。
 * 仅这些字段会被合并进 workspaces.company_profile JSONB。
 */
export interface WorkspaceProfilePatch {
  companyName?: string;
  shortName?: string;
  industry?: string;
  website?: string;
  hotline?: string;
  supportEmail?: string;
  creditCode?: string;
  contactName?: string;
  mobile?: string;
  city?: string;
  district?: string;
  subDistrict?: string;
  address?: string;
  intro?: string;
  slogan?: string;
  siteTitle?: string;
  siteDescription?: string;
  invoiceTitle?: string;
  taxId?: string;
  bankName?: string;
  bankAccount?: string;
  tags?: string[];
  /** 企业 Logo（data URL 或可访问地址），用于报价 PDF / 导出图标 */
  logoUrl?: string;
  /** 资质附件元数据（营业执照 / 手册等） */
  assetUploads?: Record<string, { fileName?: string; documentId?: string }>;
}

export interface WorkspaceMemberRecord {
  workspaceId: string;
  userId: string;
  role: WorkspaceMemberRole;
  createdAt: string;
}

export interface WorkspaceInvitationRecord {
  id: string;
  workspaceId: string;
  email: string;
  role: WorkspaceInvitationRole;
  invitedByUserId: string;
  token: string;
  status: "pending" | "accepted" | "revoked" | "expired";
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RefreshSessionRecord {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: string;
  revokedAt: string | null;
  createdAt: string;
}

export interface EmailLoginCodeRecord {
  id: string;
  email: string;
  purpose: "login" | "password_reset";
  codeHash: string;
  expiresAt: string;
  consumedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TrialRequestRecord {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string | null;
  website: string | null;
  requirement: string | null;
  requestedPlan: string | null;
  consentAcceptedAt: string | null;
  consentVersion: string | null;
  status: "pending" | "approved" | "rejected";
  processedByUserId: string | null;
  processedAt: string | null;
  reviewNotes: string | null;
  approvedWorkspaceId: string | null;
  approvedInvitationId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresInSeconds: number;
}

export interface AuthUserPayload {
  id: string;
  email: string;
  name: string;
  activeWorkspaceId: string | null;
  platformRole: "platform_admin" | null;
  /** 强制改密标记：为 true 时前端登录后跳转至改密页 */
  mustChangePassword?: boolean;
}

export interface CustomerWorkspaceSummary {
  id: string;
  name: string;
  slug: string;
  website: string | null;
  plan: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  provisionedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
  pendingAdminInvite: {
    email: string;
    status: WorkspaceInvitationRecord["status"];
    inviteUrl: string;
    expiresAt: string;
  } | null;
}

export interface WorkspaceSummary {
  id: string;
  name: string;
  slug: string;
  role: WorkspaceMemberRecord["role"];
  isActive: boolean;
}

export interface WorkspaceMemberSummary {
  userId: string;
  email: string;
  name: string;
  role: WorkspaceMemberRecord["role"];
  status: UserRecord["status"];
  joinedAt: string;
  isCurrentUser: boolean;
}

export interface WorkspaceInvitationSummary {
  id: string;
  workspaceId: string;
  workspaceName: string;
  email: string;
  role: WorkspaceInvitationRecord["role"];
  status: WorkspaceInvitationRecord["status"];
  token: string;
  inviteUrl: string;
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
  invitedBy: {
    userId: string;
    name: string;
    email: string;
  };
}

export interface WorkspaceInvitationLookup {
  id: string;
  workspaceId: string;
  workspaceName: string;
  email: string;
  role: WorkspaceInvitationRecord["role"];
  status: WorkspaceInvitationRecord["status"];
  inviteUrl: string;
  expiresAt: string;
  acceptedAt: string | null;
}

export interface TrialRequestSummary {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string | null;
  website: string | null;
  requirement: string | null;
  requestedPlan: string | null;
  consentAcceptedAt: string | null;
  consentVersion: string | null;
  status: TrialRequestRecord["status"];
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
    inviteStatus: WorkspaceInvitationRecord["status"] | null;
  } | null;
}
