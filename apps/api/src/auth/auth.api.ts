import type { ApiEnv } from "../config/env";
import type { RequestContext } from "../workspace";
import { writeWorkspaceAudit } from "../audit/audit-write";
import type { AuditApi } from "../audit/audit.api";
import type {
  EmailLoginCodeMailer,
  WorkspaceInvitationDeliveryAuditStore,
  WorkspaceInvitationMailer,
} from "./auth.mailer";
import type { AuthRepository } from "./auth.repository";
import type {
  TrialRequestSummary,
  WorkspaceInvitationRole,
  WorkspaceMemberRole,
  WorkspaceProfilePatch,
} from "./auth.types";
import { AuthAccessError, AuthService, AuthValidationError } from "./auth.service";

export { AuthAccessError, AuthValidationError };

export class AuthApi {
  private readonly service: AuthService;

  constructor(
    repository: AuthRepository,
    env: ApiEnv,
    mailer: WorkspaceInvitationMailer,
    invitationAuditStore: WorkspaceInvitationDeliveryAuditStore,
    emailLoginCodeMailer: EmailLoginCodeMailer,
    private readonly auditApi?: AuditApi,
  ) {
    this.service = new AuthService(
      repository,
      env,
      mailer,
      invitationAuditStore,
      emailLoginCodeMailer,
    );
  }

  register(body: {
    email?: string;
    password?: string;
    name?: string;
    workspaceName?: string;
    invitationToken?: string;
  }) {
    return this.service.register({
      email: body.email ?? "",
      password: body.password ?? "",
      name: body.name ?? "",
      workspaceName: body.workspaceName,
      invitationToken: body.invitationToken,
    });
  }

  login(body: { email?: string; password?: string }) {
    return this.service.login({
      email: body.email ?? "",
      password: body.password ?? "",
    });
  }

  requestEmailLoginCode(body: { email?: string }) {
    return this.service.requestEmailLoginCode({
      email: body.email ?? "",
    });
  }

  requestPasswordResetCode(body: { email?: string }) {
    return this.service.requestPasswordResetCode({
      email: body.email ?? "",
    });
  }

  verifyEmailLoginCode(body: { email?: string; code?: string }) {
    return this.service.verifyEmailLoginCode({
      email: body.email ?? "",
      code: body.code ?? "",
    });
  }

  resetPasswordWithCode(body: { email?: string; code?: string; newPassword?: string }) {
    return this.service.resetPasswordWithCode({
      email: body.email ?? "",
      code: body.code ?? "",
      newPassword: body.newPassword ?? "",
    });
  }

  changePassword(userId: string, body: { newPassword?: string }) {
    return this.service.changePassword(userId, body.newPassword ?? "");
  }

  refresh(body: { refreshToken?: string }) {
    return this.service.refresh(body.refreshToken ?? "");
  }

  getWorkspaceInvitationByToken(token: string) {
    return this.service.getWorkspaceInvitationByToken(token);
  }

  authenticate(accessToken: string) {
    return this.service.authenticateAccessToken(accessToken);
  }

  ensurePlatformAdmin() {
    return this.service.ensurePlatformAdmin();
  }

  ensureDevWorkspaceOwner() {
    return this.service.ensureDevWorkspaceOwner();
  }

  listCustomerWorkspaces(userId: string) {
    return this.service.listCustomerWorkspaces(userId);
  }

  provisionCustomerWorkspace(
    userId: string,
    body: {
      companyName: string;
      website?: string;
      plan: string;
      contactName: string;
      contactEmail: string;
      contactPhone?: string;
      adminEmail: string;
    },
  ) {
    return this.service.provisionCustomerWorkspace(userId, body);
  }

  submitTrialRequest(body: {
    companyName?: string;
    contactName?: string;
    email?: string;
    phone?: string;
    website?: string;
    requirement?: string;
    requestedPlan?: string;
  }): Promise<TrialRequestSummary> {
    return this.service.submitTrialRequest({
      companyName: body.companyName ?? "",
      contactName: body.contactName ?? "",
      email: body.email ?? "",
      phone: body.phone,
      website: body.website,
      requirement: body.requirement,
      requestedPlan: body.requestedPlan,
    });
  }

  listTrialRequests(userId: string): Promise<TrialRequestSummary[]> {
    return this.service.listTrialRequests(userId);
  }

  reviewTrialRequest(
    userId: string,
    trialRequestId: string,
    body: {
      action?: "approve" | "reject";
      plan?: string;
      adminEmail?: string;
      reviewNotes?: string;
    },
  ): Promise<TrialRequestSummary> {
    return this.service.reviewTrialRequest(userId, trialRequestId, {
      action: body.action ?? "reject",
      plan: body.plan,
      adminEmail: body.adminEmail,
      reviewNotes: body.reviewNotes,
    });
  }

  listWorkspaces(context: RequestContext) {
    return this.service.listWorkspaces(context.userId);
  }

  getCurrentWorkspace(context: RequestContext) {
    return this.service.getCurrentWorkspace(context.userId);
  }

  getWorkspaceById(userId: string, workspaceId: string) {
    return this.service.getWorkspaceById(userId, workspaceId);
  }

  async updateWorkspace(userId: string, workspaceId: string, body: WorkspaceProfilePatch) {
    const result = await this.service.updateWorkspace({ userId, workspaceId, patch: body });
    writeWorkspaceAudit(this.auditApi, { workspaceId, userId }, {
      module: "workspace",
      action: "update",
      targetId: workspaceId,
      detail: body as Record<string, unknown>,
    });
    return result;
  }

  activateWorkspace(context: RequestContext, workspaceId: string) {
    return this.service.activateWorkspace(context.userId, workspaceId);
  }

  activateWorkspaceForUser(userId: string, workspaceId: string) {
    return this.service.activateWorkspace(userId, workspaceId);
  }

  listWorkspaceMembers(context: RequestContext) {
    return this.service.listWorkspaceMembers(context.userId, context.workspaceId);
  }

  listWorkspaceInvitations(context: RequestContext) {
    return this.service.listWorkspaceInvitations(context.userId, context.workspaceId);
  }

  listWorkspaceInvitationDeliveryAudits(
    context: RequestContext,
    invitationId: string,
  ) {
    return this.service.listWorkspaceInvitationDeliveryAudits(
      context.userId,
      context.workspaceId,
      invitationId,
    );
  }

  async inviteWorkspaceMember(
    context: RequestContext,
    body: {
      email?: string;
      role?: WorkspaceInvitationRole | "sales_member" | "workspace_admin";
    },
  ) {
    const result = await this.service.inviteWorkspaceMember({
      userId: context.userId,
      workspaceId: context.workspaceId,
      email: body.email ?? "",
      role: body.role ?? "member",
    });
    writeWorkspaceAudit(this.auditApi, context, {
      module: "member",
      action: "invite",
      targetId: result.id,
      detail: { email: body.email, role: body.role ?? "member" },
    });
    return result;
  }

  acceptWorkspaceInvitation(context: RequestContext, invitationId: string) {
    return this.service.acceptWorkspaceInvitation(context.userId, invitationId);
  }

  acceptWorkspaceInvitationByToken(context: RequestContext, token: string) {
    return this.service.acceptWorkspaceInvitationByToken(context.userId, token);
  }

  revokeWorkspaceInvitation(context: RequestContext, invitationId: string) {
    return this.service.revokeWorkspaceInvitation(
      context.userId,
      context.workspaceId,
      invitationId,
    );
  }

  resendWorkspaceInvitation(context: RequestContext, invitationId: string) {
    return this.service.resendWorkspaceInvitation(
      context.userId,
      context.workspaceId,
      invitationId,
    );
  }

  async updateWorkspaceMemberRole(
    context: RequestContext,
    targetUserId: string,
    body: {
      role?: Exclude<WorkspaceMemberRole, "owner"> | "sales_member" | "workspace_admin";
      status?: "active" | "disabled";
    },
  ) {
    const result = await this.service.updateWorkspaceMemberRole({
      userId: context.userId,
      workspaceId: context.workspaceId,
      targetUserId,
      role: body.role,
      status: body.status,
    });
    writeWorkspaceAudit(this.auditApi, context, {
      module: "member",
      action: body.role ? "change_role" : "update",
      targetId: targetUserId,
      detail: {
        ...(body.role ? { role: body.role } : {}),
        ...(body.status ? { status: body.status } : {}),
      },
    });
    return result;
  }

  async removeWorkspaceMember(context: RequestContext, targetUserId: string) {
    const result = await this.service.removeWorkspaceMember({
      userId: context.userId,
      workspaceId: context.workspaceId,
      targetUserId,
    });
    writeWorkspaceAudit(this.auditApi, context, {
      module: "member",
      action: "remove",
      targetId: targetUserId,
    });
    return result;
  }

  async transferWorkspaceOwnership(context: RequestContext, targetUserId: string) {
    const result = await this.service.transferWorkspaceOwnership({
      userId: context.userId,
      workspaceId: context.workspaceId,
      targetUserId,
    });
    writeWorkspaceAudit(this.auditApi, context, {
      module: "member",
      action: "change_role",
      targetId: targetUserId,
      detail: { role: "owner", action: "transfer_ownership" },
    });
    return result;
  }

  assertWorkspaceAccess(userId: string, workspaceId: string) {
    return this.service.assertWorkspaceAccess(userId, workspaceId);
  }

  getAccountSettings(context: RequestContext) {
    return this.service.getAccountSettings({
      userId: context.userId,
      workspaceId: context.workspaceId,
      role: context.role,
    });
  }

  async updateAccountSettings(
    context: RequestContext,
    patch: {
      nickname?: string;
      phone?: string;
      email?: string;
      jobTitle?: string;
      bio?: string;
      department?: string;
      avatarUrl?: string;
      notificationPrefs?: {
        system?: boolean;
        leads?: boolean;
        quoteStatus?: boolean;
        marketing?: boolean;
      };
      language?: "zh" | "en";
    },
  ) {
    const result = await this.service.updateAccountSettings({
      userId: context.userId,
      workspaceId: context.workspaceId,
      role: context.role,
      patch,
    });
    writeWorkspaceAudit(this.auditApi, context, {
      module: "account",
      action: "update",
      targetId: context.userId,
      detail: { fields: Object.keys(patch) },
    });
    return result;
  }
}

function isAuthAccessError(error: unknown): error is AuthAccessError {
  return (
    error instanceof AuthAccessError ||
    (error instanceof Error && error.name === "AuthAccessError")
  );
}

function isAuthValidationError(error: unknown): error is AuthValidationError {
  return (
    error instanceof AuthValidationError ||
    (error instanceof Error && error.name === "AuthValidationError")
  );
}

export function toAuthHttpError(error: unknown): {
  statusCode: number;
  code: string;
  message: string;
} {
  if (isAuthAccessError(error)) {
    return { statusCode: 401, code: "UNAUTHORIZED", message: error.message };
  }

  if (isAuthValidationError(error)) {
    return { statusCode: 400, code: "VALIDATION_ERROR", message: error.message };
  }

  return {
    statusCode: 500,
    code: "INTERNAL_ERROR",
    message: "Unexpected error.",
  };
}
