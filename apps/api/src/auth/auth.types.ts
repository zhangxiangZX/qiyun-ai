/**
 * `member` is the persisted MVP role for sales users.
 * API inputs may also accept `sales_member` as an alias.
 */
export type WorkspaceMemberRole = "owner" | "admin" | "member" | "viewer";
export type WorkspaceInvitationRole = "admin" | "member" | "viewer";

export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  status: "active" | "disabled";
  activeWorkspaceId: string | null;
  platformRole: "platform_admin" | null;
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
  createdAt: string;
  updatedAt: string;
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
