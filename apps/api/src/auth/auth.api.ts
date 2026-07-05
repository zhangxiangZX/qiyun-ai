import type { ApiEnv } from "../config/env";
import type { RequestContext } from "../workspace";
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
  }): Promise<TrialRequestSummary> {
    return this.service.submitTrialRequest({
      companyName: body.companyName ?? "",
      contactName: body.contactName ?? "",
      email: body.email ?? "",
      phone: body.phone,
      website: body.website,
      requirement: body.requirement,
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

  activateWorkspace(context: RequestContext, workspaceId: string) {
    return this.service.activateWorkspace(context.userId, workspaceId);
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

  inviteWorkspaceMember(
    context: RequestContext,
    body: {
      email?: string;
      role?: WorkspaceInvitationRole | "sales_member" | "workspace_admin";
    },
  ) {
    return this.service.inviteWorkspaceMember({
      userId: context.userId,
      workspaceId: context.workspaceId,
      email: body.email ?? "",
      role: body.role ?? "member",
    });
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

  updateWorkspaceMemberRole(
    context: RequestContext,
    targetUserId: string,
    body: {
      role?: Exclude<WorkspaceMemberRole, "owner"> | "sales_member" | "workspace_admin";
    },
  ) {
    return this.service.updateWorkspaceMemberRole({
      userId: context.userId,
      workspaceId: context.workspaceId,
      targetUserId,
      role: body.role ?? "member",
    });
  }

  removeWorkspaceMember(context: RequestContext, targetUserId: string) {
    return this.service.removeWorkspaceMember({
      userId: context.userId,
      workspaceId: context.workspaceId,
      targetUserId,
    });
  }

  transferWorkspaceOwnership(context: RequestContext, targetUserId: string) {
    return this.service.transferWorkspaceOwnership({
      userId: context.userId,
      workspaceId: context.workspaceId,
      targetUserId,
    });
  }

  assertWorkspaceAccess(userId: string, workspaceId: string) {
    return this.service.assertWorkspaceAccess(userId, workspaceId);
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
