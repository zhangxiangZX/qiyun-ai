import { randomUUID, timingSafeEqual } from "node:crypto";

import type { ApiEnv } from "../config/env";
import type {
  EmailLoginCodeMailer,
  WorkspaceInvitationDeliveryAudit,
  WorkspaceInvitationDeliveryAuditStore,
  WorkspaceInvitationMailer,
} from "./auth.mailer";
import type { AuthRepository } from "./auth.repository";
import {
  createAccessToken,
  createRefreshToken,
  hashOneTimeCode,
  hashPassword,
  hashRefreshToken,
  verifyAccessToken,
  verifyPassword,
  verifyRefreshToken,
} from "./auth.crypto";
import type {
  AuthTokens,
  AuthUserPayload,
  AccountSettingsPayload,
  CustomerWorkspaceSummary,
  RefreshSessionRecord,
  TrialRequestRecord,
  TrialRequestSummary,
  UserAccountProfile,
  UserRecord,
  WorkspaceInvitationLookup,
  WorkspaceInvitationRole,
  WorkspaceInvitationSummary,
  WorkspaceMemberRole,
  WorkspaceMemberSummary,
  WorkspaceProfilePatch,
  WorkspaceRecord,
  WorkspaceSummary,
} from "./auth.types";
import { DEFAULT_WORKSPACE_PLAN, isValidWorkspacePlan } from "./workspace-plans";

export class AuthAccessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthAccessError";
  }
}

export class AuthValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthValidationError";
  }
}

function toSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function generateLoginCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function isValidEmail(value: string): boolean {
  return value.includes("@");
}

function shouldExposeDebugCode(): boolean {
  if (process.env.NODE_ENV === "test") {
    return true;
  }
  if (process.env.AUTH_SHOW_DEBUG_CODES !== "true") {
    return false;
  }
  const provider = (process.env.EMAIL_PROVIDER ?? "memory").toLowerCase();
  return provider === "memory" || provider === "console";
}

function getEmailDeliveryMode(): "simulated" | "email" {
  const provider = (process.env.EMAIL_PROVIDER ?? "memory").toLowerCase();
  return provider === "resend" ? "email" : "simulated";
}

function deriveWorkspaceNameFromEmail(email: string): string {
  const local = email.split("@")[0]?.trim() || "New User";
  const pretty = local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
  return `${pretty || "New User"} Workspace`;
}

function deriveNameFromEmail(email: string): string {
  return deriveWorkspaceNameFromEmail(email).replace(/\s+Workspace$/, "");
}

function normalizeInvitationRole(
  role: string,
): WorkspaceInvitationRole {
  if (role === "workspace_admin") {
    return "admin";
  }
  if (role === "sales_member") {
    return "member";
  }
  if (role === "admin" || role === "member" || role === "viewer") {
    return role;
  }
  throw new AuthValidationError("Invite role must be admin, sales_member, member, or viewer.");
}

function normalizeWorkspaceRole(
  role: string,
): Exclude<WorkspaceMemberRole, "owner"> {
  if (role === "workspace_admin") {
    return "admin";
  }
  if (role === "sales_member") {
    return "member";
  }
  if (role === "admin" || role === "member" || role === "viewer") {
    return role;
  }
  throw new AuthValidationError(
    "Member role must be admin, sales_member, member, or viewer.",
  );
}

export class AuthService {
  constructor(
    private readonly repository: AuthRepository,
    private readonly env: ApiEnv,
    private readonly mailer: WorkspaceInvitationMailer,
    private readonly invitationAuditStore: WorkspaceInvitationDeliveryAuditStore,
    private readonly emailLoginCodeMailer: EmailLoginCodeMailer,
  ) {}

  async register(input: {
    email: string;
    password: string;
    name: string;
    workspaceName?: string;
    invitationToken?: string;
  }): Promise<{ user: AuthUserPayload; workspaces: WorkspaceSummary[]; tokens: AuthTokens }> {
    const email = input.email.trim().toLowerCase();
    const password = input.password.trim();
    const name = input.name.trim();
    const invitationToken = input.invitationToken?.trim() || "";
    const workspaceName = (input.workspaceName?.trim() || `${name}'s Workspace`).trim();

    if (!email || !password || !name) {
      throw new AuthValidationError("Email, password, and name are required.");
    }

    if (await this.repository.findUserByEmail(email)) {
      throw new AuthValidationError("Email already exists.");
    }

    let pendingInvitation: Awaited<
      ReturnType<AuthRepository["findWorkspaceInvitationByToken"]>
    > = null;

    if (invitationToken) {
      pendingInvitation = await this.repository.findWorkspaceInvitationByToken(invitationToken);
      if (!pendingInvitation || pendingInvitation.status !== "pending") {
        throw new AuthValidationError("邀请无效或已失效。");
      }
      if (pendingInvitation.email.toLowerCase() !== email) {
        throw new AuthValidationError("注册邮箱必须与邀请邮箱一致。");
      }
    } else if (process.env.NODE_ENV !== "test") {
      throw new AuthValidationError(
        "当前仅支持通过邀请链接开通账号。如需试用，请提交申请并由管理员开通。",
      );
    }

    const now = new Date().toISOString();
    const user = await this.repository.createUser({
      id: `user_${randomUUID()}`,
      email,
      passwordHash: hashPassword(password),
      name,
      status: "active",
      activeWorkspaceId: null,
      platformRole: null,
      createdAt: now,
      updatedAt: now,
    });

    if (invitationToken && pendingInvitation) {
      await this.acceptWorkspaceInvitation(user.id, pendingInvitation.id);
    } else {
      const workspace = await this.createWorkspaceForUser(user.id, workspaceName, now);
      await this.repository.updateUser(user.id, {
        activeWorkspaceId: workspace.id,
        updatedAt: now,
      });
    }

    const hydratedUser = await this.repository.findUserById(user.id);
    if (!hydratedUser) {
      throw new AuthAccessError("User account is unavailable.");
    }

    const tokens = await this.issueTokens(hydratedUser);

    return {
      user: this.toUserPayload(hydratedUser),
      workspaces: await this.listWorkspaces(hydratedUser.id),
      tokens,
    };
  }

  async login(input: {
    email: string;
    password: string;
  }): Promise<{ user: AuthUserPayload; workspaces: WorkspaceSummary[]; tokens: AuthTokens }> {
    const email = input.email.trim().toLowerCase();
    const password = input.password.trim();
    const user = await this.repository.findUserByEmail(email);

    if (!user || !verifyPassword(password, user.passwordHash)) {
      throw new AuthAccessError("Invalid email or password.");
    }

    if (user.status !== "active") {
      throw new AuthAccessError("User account is disabled.");
    }

    return {
      user: this.toUserPayload(user),
      workspaces: await this.listWorkspaces(user.id),
      tokens: await this.issueTokens(user),
    };
  }

  async requestEmailLoginCode(input: {
    email: string;
  }): Promise<{ sent: true; expiresAt: string; deliveryMode: "simulated" | "email"; debugCode?: string }> {
    return this.issueOneTimeCode({
      email: input.email,
      purpose: "login",
    });
  }

  async requestPasswordResetCode(input: {
    email: string;
  }): Promise<{ sent: true; expiresAt: string; deliveryMode: "simulated" | "email"; debugCode?: string }> {
    const email = input.email.trim().toLowerCase();
    if (!email || !isValidEmail(email)) {
      throw new AuthValidationError("A valid email is required.");
    }

    // 防账号枚举：无论账号是否存在都返回成功态，仅对存在的账号实际发码。
    const user = await this.repository.findUserByEmail(email);
    if (!user) {
      return {
        sent: true,
        expiresAt: new Date(Date.now() + 1000 * 60 * 10).toISOString(),
        deliveryMode: "simulated",
      };
    }

    return this.issueOneTimeCode({
      email,
      purpose: "password_reset",
    });
  }

  async resetPasswordWithCode(input: {
    email: string;
    code: string;
    newPassword: string;
  }): Promise<{ reset: true }> {
    const email = input.email.trim().toLowerCase();
    const code = input.code.trim();
    const newPassword = input.newPassword.trim();

    if (!email || !isValidEmail(email)) {
      throw new AuthValidationError("A valid email is required.");
    }
    if (!/^\d{6}$/.test(code)) {
      throw new AuthValidationError("Verification code must be 6 digits.");
    }
    if (newPassword.length < 6) {
      throw new AuthValidationError("Password must be at least 6 characters.");
    }

    const latestCode = await this.requireLatestUsableCode(email, "password_reset");
    if (!this.constantTimeCodeEquals(latestCode.codeHash, hashOneTimeCode(code))) {
      throw new AuthAccessError("Verification code is incorrect or has expired.");
    }

    const user = await this.repository.findUserByEmail(email);
    if (!user) {
      // 防账号枚举：验证码校验通过但账号不存在时，返回与「验证码错误」一致的泛型错误。
      throw new AuthAccessError("Verification code is incorrect or has expired.");
    }

    const now = new Date().toISOString();
    await this.repository.consumeEmailLoginCode(latestCode.id, now);
    await this.repository.updateUser(user.id, {
      passwordHash: hashPassword(newPassword),
      updatedAt: now,
    });
    return { reset: true };
  }

  async verifyEmailLoginCode(input: {
    email: string;
    code: string;
  }): Promise<{ user: AuthUserPayload; workspaces: WorkspaceSummary[]; tokens: AuthTokens }> {
    const email = input.email.trim().toLowerCase();
    const code = input.code.trim();

    if (!email || !isValidEmail(email)) {
      throw new AuthValidationError("A valid email is required.");
    }
    if (!/^\d{6}$/.test(code)) {
      throw new AuthValidationError("Verification code must be 6 digits.");
    }

    const latestCode = await this.requireLatestUsableCode(email, "login");
    if (!this.constantTimeCodeEquals(latestCode.codeHash, hashOneTimeCode(code))) {
      throw new AuthAccessError("Verification code is incorrect.");
    }

    await this.repository.consumeEmailLoginCode(latestCode.id, new Date().toISOString());

    let user = await this.repository.findUserByEmail(email);
    if (!user) {
      const now = new Date().toISOString();
      user = await this.repository.createUser({
        id: `user_${randomUUID()}`,
        email,
        passwordHash: hashPassword(randomUUID()),
        name: deriveNameFromEmail(email),
        status: "active",
        activeWorkspaceId: null,
        platformRole: null,
        mustChangePassword: true,
        createdAt: now,
        updatedAt: now,
      });

      const workspace = await this.createWorkspaceForUser(
        user.id,
        deriveWorkspaceNameFromEmail(email),
        now,
      );
      user = await this.repository.updateUser(user.id, {
        activeWorkspaceId: workspace.id,
        updatedAt: now,
      });
    }

    if (!user || user.status !== "active") {
      throw new AuthAccessError("User account is unavailable.");
    }

    return {
      user: this.toUserPayload(user),
      workspaces: await this.listWorkspaces(user.id),
      tokens: await this.issueTokens(user),
    };
  }

  async refresh(refreshToken: string): Promise<{
    user: AuthUserPayload;
    workspaces: WorkspaceSummary[];
    tokens: AuthTokens;
  }> {
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken, this.env.JWT_REFRESH_SECRET);
    } catch {
      throw new AuthAccessError("Refresh session is invalid.");
    }
    const tokenHash = hashRefreshToken(refreshToken);
    const session = await this.repository.findRefreshSessionByHash(tokenHash);

    if (
      !session ||
      session.userId !== payload.sub ||
      session.id !== payload.sessionId ||
      session.revokedAt !== null ||
      new Date(session.expiresAt).getTime() <= Date.now()
    ) {
      throw new AuthAccessError("Refresh session is invalid.");
    }

    await this.repository.revokeRefreshSession(session.id, new Date().toISOString());

    const user = await this.repository.findUserById(payload.sub);
    if (!user || user.status !== "active") {
      throw new AuthAccessError("User account is unavailable.");
    }

    return {
      user: this.toUserPayload(user),
      workspaces: await this.listWorkspaces(user.id),
      tokens: await this.issueTokens(user),
    };
  }

  async authenticateAccessToken(accessToken: string): Promise<AuthUserPayload> {
    let payload;
    try {
      payload = verifyAccessToken(accessToken, this.env.JWT_SECRET);
    } catch {
      throw new AuthAccessError("Invalid access token.");
    }
    const user = await this.repository.findUserById(payload.sub);
    if (!user || user.status !== "active") {
      throw new AuthAccessError("User account is unavailable.");
    }
    return this.toUserPayload(user);
  }

  async changePassword(
    userId: string,
    newPassword: string,
  ): Promise<{ user: AuthUserPayload; workspaces: WorkspaceSummary[]; tokens: AuthTokens }> {
    const password = newPassword.trim();
    if (password.length < 8) {
      throw new AuthValidationError("密码至少需 8 位。");
    }
    if (!/\d/.test(password) || !/[a-zA-Z]/.test(password)) {
      throw new AuthValidationError("密码需同时包含数字和字母。");
    }

    const user = await this.repository.findUserById(userId);
    if (!user || user.status !== "active") {
      throw new AuthAccessError("User account is unavailable.");
    }

    const now = new Date().toISOString();
    const updated = await this.repository.updateUser(user.id, {
      passwordHash: hashPassword(password),
      mustChangePassword: false,
      updatedAt: now,
    });
    if (!updated) {
      throw new AuthAccessError("User account is unavailable.");
    }

    return {
      user: this.toUserPayload(updated),
      workspaces: await this.listWorkspaces(updated.id),
      tokens: await this.issueTokens(updated),
    };
  }

  async ensurePlatformAdmin(): Promise<void> {
    const email = (
      process.env.PLATFORM_ADMIN_EMAIL ??
      (process.env.NODE_ENV === "test" ? "platform@qiyun.test" : "")
    )
      .trim()
      .toLowerCase();
    const password = (
      process.env.PLATFORM_ADMIN_PASSWORD ??
      (process.env.NODE_ENV === "test" ? "platform-secret123" : "")
    ).trim();
    const name = (process.env.PLATFORM_ADMIN_NAME ?? "平台管理员").trim();

    if (!email || !password) {
      return;
    }

    const now = new Date().toISOString();
    const existing = await this.repository.findUserByEmail(email);
    if (!existing) {
      await this.repository.createUser({
        id: `user_${randomUUID()}`,
        email,
        passwordHash: hashPassword(password),
        name,
        status: "active",
        activeWorkspaceId: null,
        platformRole: "platform_admin",
        createdAt: now,
        updatedAt: now,
      });
      return;
    }

    if (existing.platformRole !== "platform_admin") {
      await this.repository.updateUser(existing.id, {
        platformRole: "platform_admin",
        updatedAt: now,
      });
    }
  }

  async ensureDevWorkspaceOwner(): Promise<void> {
    if (process.env.NODE_ENV !== "development") {
      return;
    }

    const email = (process.env.DEV_OWNER_EMAIL ?? "owner@qiyun.ai").trim().toLowerCase();
    const password = (
      process.env.DEV_OWNER_PASSWORD ??
      process.env.PLATFORM_ADMIN_PASSWORD ??
      "Qiyun@2026"
    ).trim();
    const name = (process.env.DEV_OWNER_NAME ?? "企业管理员").trim();
    const workspaceName = (process.env.DEV_WORKSPACE_NAME ?? "企云科技有限公司").trim();
    const workspaceId = (process.env.NEXT_PUBLIC_WORKSPACE_ID ?? "ws_dev").trim();

    if (!email || !password) {
      return;
    }

    const now = new Date().toISOString();
    let user = await this.repository.findUserByEmail(email);

    if (!user) {
      user = await this.repository.createUser({
        id: `user_${randomUUID()}`,
        email,
        passwordHash: hashPassword(password),
        name,
        status: "active",
        activeWorkspaceId: null,
        platformRole: null,
        createdAt: now,
        updatedAt: now,
      });
    }

    let workspace = await this.repository.findWorkspaceById(workspaceId);
    if (!workspace) {
      workspace = await this.repository.createWorkspace({
        id: workspaceId,
        name: workspaceName,
        slug: "qiyun-dev",
        ownerId: user.id,
        website: null,
        plan: "enterprise",
        contactName: name,
        contactEmail: email,
        contactPhone: null,
        provisionedByUserId: null,
        createdAt: now,
        updatedAt: now,
      });
    }

    const membership = await this.repository.findWorkspaceMember(workspace.id, user.id);
    if (!membership) {
      await this.repository.upsertWorkspaceMember({
        workspaceId: workspace.id,
        userId: user.id,
        role: "owner",
        createdAt: now,
      });
    }

    if (user.activeWorkspaceId !== workspace.id) {
      await this.repository.updateUser(user.id, {
        activeWorkspaceId: workspace.id,
        updatedAt: now,
      });
    }
  }

  async listCustomerWorkspaces(userId: string): Promise<CustomerWorkspaceSummary[]> {
    await this.requirePlatformAdmin(userId);
    const workspaces = await this.repository.listWorkspaces();
    const summaries: CustomerWorkspaceSummary[] = [];

    for (const workspace of workspaces) {
      summaries.push(await this.toCustomerWorkspaceSummary(workspace));
    }

    return summaries.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  async provisionCustomerWorkspace(
    userId: string,
    input: {
      companyName: string;
      website?: string;
      plan: string;
      contactName: string;
      contactEmail: string;
      contactPhone?: string;
      adminEmail: string;
    },
  ): Promise<{ workspace: CustomerWorkspaceSummary; invitation: WorkspaceInvitationSummary }> {
    await this.requirePlatformAdmin(userId);

    const companyName = input.companyName.trim();
    const adminEmail = input.adminEmail.trim().toLowerCase();
    const plan = input.plan.trim();
    const contactName = input.contactName.trim();
    const contactEmail = input.contactEmail.trim().toLowerCase();

    if (!companyName || !plan || !contactName || !contactEmail || !adminEmail) {
      throw new AuthValidationError("请完整填写企业名称、套餐、联系人与管理员邮箱。");
    }

    const now = new Date().toISOString();
    const baseSlug = toSlug(companyName) || "workspace";
    let slug = baseSlug;
    let suffix = 1;
    while (await this.repository.findWorkspaceBySlug(slug)) {
      suffix += 1;
      slug = `${baseSlug}-${suffix}`;
    }

    const workspace = await this.repository.createWorkspace({
      id: `ws_${randomUUID()}`,
      name: companyName,
      slug,
      ownerId: userId,
      website: input.website?.trim() || null,
      plan,
      contactName,
      contactEmail,
      contactPhone: input.contactPhone?.trim() || null,
      provisionedByUserId: userId,
      createdAt: now,
      updatedAt: now,
    });

    await this.repository.upsertWorkspaceMember({
      workspaceId: workspace.id,
      userId,
      role: "owner",
      createdAt: now,
    });

    const invitation = await this.inviteWorkspaceMember({
      userId,
      workspaceId: workspace.id,
      email: adminEmail,
      role: "admin",
    });

    return {
      workspace: await this.toCustomerWorkspaceSummary(workspace, invitation),
      invitation,
    };
  }

  async submitTrialRequest(input: {
    companyName: string;
    contactName: string;
    email: string;
    phone?: string;
    website?: string;
    requirement?: string;
    requestedPlan?: string;
    consentAccepted?: boolean;
    consentAcceptedAt?: string;
    consentVersion?: string;
  }): Promise<TrialRequestSummary> {
    const companyName = input.companyName.trim();
    const contactName = input.contactName.trim();
    const email = input.email.trim().toLowerCase();
    const phone = input.phone?.trim() || null;
    const website = input.website?.trim() || null;
    const requirement = input.requirement?.trim() || null;
    const requestedPlanInput = input.requestedPlan?.trim() || DEFAULT_WORKSPACE_PLAN;
    if (!isValidWorkspacePlan(requestedPlanInput)) {
      throw new AuthValidationError("A valid trial plan is required.");
    }
    const requestedPlan = requestedPlanInput;
    const consentAcceptedAt = input.consentAcceptedAt?.trim() || "";
    const consentVersion = input.consentVersion?.trim() || "";

    if (!companyName || !contactName || !email) {
      throw new AuthValidationError("Company name, contact name, and email are required.");
    }

    if (!isValidEmail(email)) {
      throw new AuthValidationError("A valid work email is required.");
    }

    if (input.consentAccepted !== true || !consentVersion || !Number.isFinite(Date.parse(consentAcceptedAt))) {
      throw new AuthValidationError("Privacy consent is required.");
    }

    const pending = await this.repository.findPendingTrialRequestByEmail(email);
    if (pending) {
      throw new AuthValidationError("A pending trial request already exists for this email.");
    }

    const now = new Date().toISOString();
    const record = await this.repository.createTrialRequest({
      id: `tr_${randomUUID()}`,
      companyName,
      contactName,
      email,
      phone,
      website,
      requirement,
      requestedPlan,
      consentAcceptedAt: new Date(consentAcceptedAt).toISOString(),
      consentVersion,
      status: "pending",
      processedByUserId: null,
      processedAt: null,
      reviewNotes: null,
      approvedWorkspaceId: null,
      approvedInvitationId: null,
      createdAt: now,
      updatedAt: now,
    });

    return this.toTrialRequestSummary(record);
  }

  async listTrialRequests(userId: string): Promise<TrialRequestSummary[]> {
    await this.requirePlatformAdmin(userId);
    const records = await this.repository.listTrialRequests();
    return Promise.all(records.map((record) => this.toTrialRequestSummary(record)));
  }

  async reviewTrialRequest(
    userId: string,
    trialRequestId: string,
    input: {
      action: "approve" | "reject";
      plan?: string;
      adminEmail?: string;
      reviewNotes?: string;
    },
  ): Promise<TrialRequestSummary> {
    await this.requirePlatformAdmin(userId);
    const record = await this.requireTrialRequest(trialRequestId);
    if (record.status !== "pending") {
      throw new AuthValidationError("Only pending trial requests can be reviewed.");
    }

    const now = new Date().toISOString();
    const reviewNotes = input.reviewNotes?.trim() || null;

    if (input.action === "reject") {
      const updated = await this.repository.updateTrialRequest(record.id, {
        status: "rejected",
        processedByUserId: userId,
        processedAt: now,
        reviewNotes,
        updatedAt: now,
      });
      return this.toTrialRequestSummary(updated ?? record);
    }

    const plan = input.plan?.trim() || record.requestedPlan || DEFAULT_WORKSPACE_PLAN;
    const adminEmail = input.adminEmail?.trim().toLowerCase() || record.email;
    if (!isValidEmail(adminEmail)) {
      throw new AuthValidationError("A valid admin email is required to approve a trial request.");
    }

    const provisioned = await this.provisionCustomerWorkspace(userId, {
      companyName: record.companyName,
      website: record.website ?? undefined,
      plan,
      contactName: record.contactName,
      contactEmail: record.email,
      contactPhone: record.phone ?? undefined,
      adminEmail,
    });

    const updated = await this.repository.updateTrialRequest(record.id, {
      status: "approved",
      processedByUserId: userId,
      processedAt: now,
      reviewNotes,
      approvedWorkspaceId: provisioned.workspace.id,
      approvedInvitationId: provisioned.invitation.id,
      updatedAt: now,
    });

    return this.toTrialRequestSummary(updated ?? record);
  }

  async listWorkspaces(userId: string): Promise<WorkspaceSummary[]> {
    const memberships = await this.repository.listWorkspaceMembersByUser(userId);
    const user = await this.repository.findUserById(userId);
    if (!user) {
      throw new AuthAccessError("User not found.");
    }

    const result: WorkspaceSummary[] = [];
    for (const membership of memberships) {
      const workspace = await this.repository.findWorkspaceById(membership.workspaceId);
      if (!workspace) continue;
      result.push({
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
        role: membership.role,
        isActive: workspace.id === user.activeWorkspaceId,
      });
    }
    return result;
  }

  async listWorkspaceMembers(userId: string, workspaceId: string): Promise<WorkspaceMemberSummary[]> {
    await this.assertWorkspaceAccess(userId, workspaceId);
    const memberships = await this.repository.listWorkspaceMembers(workspaceId);
    const result: WorkspaceMemberSummary[] = [];

    for (const membership of memberships) {
      const user = await this.repository.findUserById(membership.userId);
      if (!user) continue;
      result.push({
        userId: user.id,
        email: user.email,
        name: user.name,
        role: membership.role,
        status: user.status,
        joinedAt: membership.createdAt,
        isCurrentUser: user.id === userId,
      });
    }

    return result.sort((left, right) => {
      const order = { owner: 0, admin: 1, member: 2, viewer: 3 } as const;
      return order[left.role] - order[right.role] || left.name.localeCompare(right.name);
    });
  }

  async listWorkspaceInvitations(
    userId: string,
    workspaceId: string,
  ): Promise<WorkspaceInvitationSummary[]> {
    await this.requireWorkspaceManager(userId, workspaceId);
    const invitations = await this.repository.listWorkspaceInvitations(workspaceId);
    const summaries = await Promise.all(
      invitations.map((invitation) => this.toInvitationSummary(invitation)),
    );
    return summaries.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  async listWorkspaceInvitationDeliveryAudits(
    userId: string,
    workspaceId: string,
    invitationId: string,
  ): Promise<WorkspaceInvitationDeliveryAudit[]> {
    await this.requireWorkspaceManager(userId, workspaceId);
    const invitation = await this.requireWorkspaceInvitation(invitationId);
    if (invitation.workspaceId !== workspaceId) {
      throw new AuthAccessError("Workspace invitation not found.");
    }
    return this.invitationAuditStore.listByInvitation(invitationId);
  }

  async getWorkspaceInvitationByToken(token: string): Promise<WorkspaceInvitationLookup> {
    const invitation = await this.repository.findWorkspaceInvitationByToken(token.trim());
    if (!invitation) {
      throw new AuthAccessError("Workspace invitation not found.");
    }

    if (
      invitation.status === "pending" &&
      new Date(invitation.expiresAt).getTime() <= Date.now()
    ) {
      await this.repository.updateWorkspaceInvitation(invitation.id, {
        status: "expired",
        updatedAt: new Date().toISOString(),
      });
    }

    return this.toInvitationLookup(await this.requireWorkspaceInvitation(invitation.id));
  }

  async inviteWorkspaceMember(input: {
    userId: string;
    workspaceId: string;
    email: string;
    role: "admin" | "member" | "sales_member" | "viewer" | "workspace_admin";
  }): Promise<WorkspaceInvitationSummary> {
    await this.requireWorkspaceManager(input.userId, input.workspaceId);

    const email = input.email.trim().toLowerCase();
    if (!email) {
      throw new AuthValidationError("Invite email is required.");
    }
    const inviteRole = normalizeInvitationRole(input.role);

    const existingUser = await this.repository.findUserByEmail(email);
    if (existingUser && (await this.repository.findWorkspaceMember(input.workspaceId, existingUser.id))) {
      throw new AuthValidationError("User is already a member of this workspace.");
    }

    const pending = await this.repository.findPendingWorkspaceInvitationByEmail(
      input.workspaceId,
      email,
    );
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString();

    if (pending) {
      const updated = await this.repository.updateWorkspaceInvitation(pending.id, {
        role: inviteRole,
        invitedByUserId: input.userId,
        status: "pending",
        token: `wsi_${randomUUID()}`,
        acceptedAt: null,
        expiresAt,
        updatedAt: now,
      });
      const summary = await this.toInvitationSummary(updated!);
      await this.sendWorkspaceInvitationEmail(summary);
      return summary;
    }

    const created = await this.repository.createWorkspaceInvitation({
      id: `invite_${randomUUID()}`,
      workspaceId: input.workspaceId,
      email,
      role: inviteRole,
      invitedByUserId: input.userId,
      token: `wsi_${randomUUID()}`,
      status: "pending",
      expiresAt,
      acceptedAt: null,
      createdAt: now,
      updatedAt: now,
    });

    const summary = await this.toInvitationSummary(created);
    await this.sendWorkspaceInvitationEmail(summary);
    return summary;
  }

  async acceptWorkspaceInvitation(userId: string, invitationId: string): Promise<WorkspaceInvitationSummary> {
    const user = await this.requireUser(userId);
    const invitation = await this.requireWorkspaceInvitation(invitationId);

    if (invitation.email.toLowerCase() !== user.email.toLowerCase()) {
      throw new AuthAccessError("Invitation email does not match current user.");
    }

    if (invitation.status !== "pending") {
      throw new AuthValidationError("Invitation is no longer pending.");
    }

    if (new Date(invitation.expiresAt).getTime() <= Date.now()) {
      await this.repository.updateWorkspaceInvitation(invitation.id, {
        status: "expired",
        updatedAt: new Date().toISOString(),
      });
      throw new AuthValidationError("Invitation has expired.");
    }

    const membership = await this.repository.findWorkspaceMember(invitation.workspaceId, user.id);
    if (!membership) {
      await this.repository.upsertWorkspaceMember({
        workspaceId: invitation.workspaceId,
        userId: user.id,
        role: invitation.role,
        createdAt: new Date().toISOString(),
      });
    }

    const updatedAt = new Date().toISOString();
    await this.repository.updateWorkspaceInvitation(invitation.id, {
      status: "accepted",
      acceptedAt: updatedAt,
      updatedAt,
    });

    if (!user.activeWorkspaceId) {
      await this.repository.updateUser(user.id, {
        activeWorkspaceId: invitation.workspaceId,
        updatedAt,
      });
    }

    return this.toInvitationSummary(await this.requireWorkspaceInvitation(invitation.id));
  }

  async acceptWorkspaceInvitationByToken(
    userId: string,
    token: string,
  ): Promise<WorkspaceInvitationSummary> {
    const invitation = await this.repository.findWorkspaceInvitationByToken(token.trim());
    if (!invitation) {
      throw new AuthAccessError("Workspace invitation not found.");
    }

    return this.acceptWorkspaceInvitation(userId, invitation.id);
  }

  async revokeWorkspaceInvitation(
    userId: string,
    workspaceId: string,
    invitationId: string,
  ): Promise<WorkspaceInvitationSummary> {
    await this.requireWorkspaceManager(userId, workspaceId);
    const invitation = await this.requireWorkspaceInvitation(invitationId);

    if (invitation.workspaceId !== workspaceId) {
      throw new AuthAccessError("Workspace invitation not found.");
    }

    if (invitation.status === "accepted") {
      throw new AuthValidationError("Accepted invitation cannot be revoked.");
    }

    const updated = await this.repository.updateWorkspaceInvitation(invitation.id, {
      status: "revoked",
      updatedAt: new Date().toISOString(),
    });

    return this.toInvitationSummary(updated!);
  }

  async resendWorkspaceInvitation(
    userId: string,
    workspaceId: string,
    invitationId: string,
  ): Promise<WorkspaceInvitationSummary> {
    await this.requireWorkspaceManager(userId, workspaceId);
    const invitation = await this.requireWorkspaceInvitation(invitationId);

    if (invitation.workspaceId !== workspaceId) {
      throw new AuthAccessError("Workspace invitation not found.");
    }

    if (invitation.status === "accepted") {
      throw new AuthValidationError("Accepted invitation cannot be resent.");
    }

    const existingUser = await this.repository.findUserByEmail(invitation.email);
    if (existingUser && (await this.repository.findWorkspaceMember(workspaceId, existingUser.id))) {
      throw new AuthValidationError("User is already a member of this workspace.");
    }

    const updated = await this.repository.updateWorkspaceInvitation(invitation.id, {
      invitedByUserId: userId,
      token: `wsi_${randomUUID()}`,
      status: "pending",
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
      acceptedAt: null,
      updatedAt: new Date().toISOString(),
    });

    const summary = await this.toInvitationSummary(updated!);
    await this.sendWorkspaceInvitationEmail(summary);
    return summary;
  }

  async updateWorkspaceMemberRole(input: {
    userId: string;
    workspaceId: string;
    targetUserId: string;
    role?: "admin" | "member" | "sales_member" | "viewer" | "workspace_admin";
    status?: UserRecord["status"];
  }): Promise<WorkspaceMemberSummary> {
    const actor = await this.requireWorkspaceManager(input.userId, input.workspaceId);
    const membership = await this.repository.findWorkspaceMember(input.workspaceId, input.targetUserId);
    if (!membership) {
      throw new AuthAccessError("Workspace member not found.");
    }

    if (membership.role === "owner") {
      if (input.role !== undefined) {
        throw new AuthValidationError("Owner role cannot be changed.");
      }
      if (input.status === "disabled") {
        throw new AuthValidationError("Owner account cannot be disabled.");
      }
    }

    if (input.role !== undefined) {
      if (actor.role === "admin" && membership.role === "admin" && input.targetUserId !== input.userId) {
        throw new AuthAccessError("Admins cannot change another admin.");
      }
      const nextRole = normalizeWorkspaceRole(input.role);
      await this.repository.upsertWorkspaceMember({
        ...membership,
        role: nextRole,
      });
    }

    if (input.status !== undefined) {
      const user = await this.repository.findUserById(input.targetUserId);
      if (!user) {
        throw new AuthAccessError("Workspace member not found.");
      }
      await this.repository.updateUser(user.id, {
        status: input.status,
        updatedAt: new Date().toISOString(),
      });
    }

    if (input.role === undefined && input.status === undefined) {
      throw new AuthValidationError("No member changes were provided.");
    }

    return this.requireWorkspaceMemberSummary(input.workspaceId, input.targetUserId, input.userId);
  }

  async removeWorkspaceMember(input: {
    userId: string;
    workspaceId: string;
    targetUserId: string;
  }): Promise<{ removedUserId: string }> {
    const actor = await this.requireWorkspaceManager(input.userId, input.workspaceId);
    const membership = await this.repository.findWorkspaceMember(input.workspaceId, input.targetUserId);
    if (!membership) {
      throw new AuthAccessError("Workspace member not found.");
    }

    if (membership.role === "owner") {
      throw new AuthValidationError("Owner cannot be removed.");
    }

    if (actor.role === "admin" && membership.role === "admin" && input.targetUserId !== input.userId) {
      throw new AuthAccessError("Admins cannot remove another admin.");
    }

    await this.repository.removeWorkspaceMember(input.workspaceId, input.targetUserId);

    const user = await this.repository.findUserById(input.targetUserId);
    if (user?.activeWorkspaceId === input.workspaceId) {
      const nextWorkspace = (await this.repository.listWorkspaceMembersByUser(user.id))[0]?.workspaceId ?? null;
      await this.repository.updateUser(user.id, {
        activeWorkspaceId: nextWorkspace,
        updatedAt: new Date().toISOString(),
      });
    }

    return { removedUserId: input.targetUserId };
  }

  async transferWorkspaceOwnership(input: {
    userId: string;
    workspaceId: string;
    targetUserId: string;
  }): Promise<{
    workspace: WorkspaceSummary;
    previousOwner: WorkspaceMemberSummary;
    newOwner: WorkspaceMemberSummary;
  }> {
    const actor = await this.requireMembership(input.userId, input.workspaceId);
    if (actor.role !== "owner") {
      throw new AuthAccessError("Only the workspace owner can transfer ownership.");
    }

    if (input.targetUserId === input.userId) {
      throw new AuthValidationError("Ownership is already assigned to this user.");
    }

    const workspace = await this.repository.findWorkspaceById(input.workspaceId);
    const targetMembership = await this.repository.findWorkspaceMember(
      input.workspaceId,
      input.targetUserId,
    );
    if (!workspace || !targetMembership) {
      throw new AuthAccessError("Target member is not part of this workspace.");
    }

    const updatedAt = new Date().toISOString();
    await this.repository.updateWorkspace(workspace.id, {
      ownerId: input.targetUserId,
      updatedAt,
    });
    await this.repository.upsertWorkspaceMember({
      ...actor,
      role: "admin",
    });
    await this.repository.upsertWorkspaceMember({
      ...targetMembership,
      role: "owner",
    });

    return {
      workspace: {
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
        role: "owner",
        isActive: (await this.requireUser(input.targetUserId)).activeWorkspaceId === workspace.id,
      },
      previousOwner: await this.requireWorkspaceMemberSummary(
        workspace.id,
        input.userId,
        input.userId,
      ),
      newOwner: await this.requireWorkspaceMemberSummary(
        workspace.id,
        input.targetUserId,
        input.userId,
      ),
    };
  }

  async getCurrentWorkspace(userId: string): Promise<WorkspaceSummary> {
    const user = await this.requireUser(userId);
    const activeWorkspaceId = user.activeWorkspaceId;
    if (!activeWorkspaceId) {
      throw new AuthAccessError("No active workspace is set.");
    }

    const membership = await this.repository.findWorkspaceMember(activeWorkspaceId, userId);
    const workspace = await this.repository.findWorkspaceById(activeWorkspaceId);
    if (!membership || !workspace) {
      throw new AuthAccessError("Active workspace is unavailable.");
    }

    return {
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      role: membership.role,
      isActive: true,
    };
  }

  async activateWorkspace(userId: string, workspaceId: string): Promise<WorkspaceSummary> {
    const user = await this.requireUser(userId);
    const membership = await this.repository.findWorkspaceMember(workspaceId, user.id);
    const workspace = await this.repository.findWorkspaceById(workspaceId);
    if (!membership || !workspace) {
      throw new AuthAccessError("Workspace is not accessible.");
    }

    await this.repository.updateUser(user.id, {
      activeWorkspaceId: workspaceId,
      updatedAt: new Date().toISOString(),
    });

    return {
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      role: membership.role,
      isActive: true,
    };
  }

  async assertWorkspaceAccess(userId: string, workspaceId: string): Promise<WorkspaceSummary> {
    const membership = await this.repository.findWorkspaceMember(workspaceId, userId);
    const workspace = await this.repository.findWorkspaceById(workspaceId);
    if (!membership || !workspace) {
      throw new AuthAccessError("Workspace is not accessible.");
    }

    return {
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      role: membership.role,
      isActive: false,
    };
  }

  async getWorkspaceRole(
    userId: string,
    workspaceId: string,
  ): Promise<WorkspaceMemberRole> {
    return (await this.requireMembership(userId, workspaceId)).role;
  }

  async getWorkspaceById(userId: string, workspaceId: string): Promise<WorkspaceRecord> {
    await this.assertWorkspaceAccess(userId, workspaceId);
    const workspace = await this.repository.findWorkspaceById(workspaceId);
    if (!workspace) {
      throw new AuthAccessError("Workspace not found.");
    }
    return workspace;
  }

  async updateWorkspace(input: {
    userId: string;
    workspaceId: string;
    patch: WorkspaceProfilePatch;
  }): Promise<WorkspaceRecord> {
    await this.requireWorkspaceManager(input.userId, input.workspaceId);
    const current = await this.repository.findWorkspaceById(input.workspaceId);
    if (!current) {
      throw new AuthAccessError("Workspace not found.");
    }

    const baseProfile =
      current.companyProfile && typeof current.companyProfile === "object"
        ? current.companyProfile
        : {};
    const mergedProfile: Record<string, unknown> = {
      ...baseProfile,
      ...this.sanitizeProfilePatch(input.patch),
    };

    const updated = await this.repository.updateWorkspace(current.id, {
      companyProfile: mergedProfile,
      updatedAt: new Date().toISOString(),
    });
    if (!updated) {
      throw new AuthAccessError("Workspace not found.");
    }
    return updated;
  }

  private sanitizeProfilePatch(patch: WorkspaceProfilePatch): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(patch)) {
      if (value !== undefined) {
        out[key] = value;
      }
    }
    return out;
  }

  private async createWorkspaceForUser(userId: string, workspaceName: string, now: string) {
    const baseSlug = toSlug(workspaceName) || "workspace";
    let slug = baseSlug;
    let suffix = 1;
    while (await this.repository.findWorkspaceBySlug(slug)) {
      suffix += 1;
      slug = `${baseSlug}-${suffix}`;
    }

    const workspace = await this.repository.createWorkspace({
      id: `ws_${randomUUID()}`,
      name: workspaceName,
      slug,
      ownerId: userId,
      website: null,
      plan: null,
      contactName: null,
      contactEmail: null,
      contactPhone: null,
      provisionedByUserId: null,
      createdAt: now,
      updatedAt: now,
    });

    await this.repository.upsertWorkspaceMember({
      workspaceId: workspace.id,
      userId,
      role: "owner",
      createdAt: now,
    });

    return workspace;
  }

  private async issueOneTimeCode(input: {
    email: string;
    purpose: "login" | "password_reset";
  }): Promise<{ sent: true; expiresAt: string; deliveryMode: "simulated" | "email"; debugCode?: string }> {
    const email = input.email.trim().toLowerCase();
    if (!email || !isValidEmail(email)) {
      throw new AuthValidationError("A valid email is required.");
    }

    const code = generateLoginCode();
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 10).toISOString();

    await this.repository.createEmailLoginCode({
      id: `elc_${randomUUID()}`,
      email,
      purpose: input.purpose,
      codeHash: hashOneTimeCode(code),
      expiresAt,
      consumedAt: null,
      createdAt: now,
      updatedAt: now,
    });

    await this.emailLoginCodeMailer.sendCode({
      recipientEmail: email,
      code,
      expiresAt,
      sentAt: now,
    });

    return {
      sent: true,
      expiresAt,
      deliveryMode: getEmailDeliveryMode(),
      debugCode: shouldExposeDebugCode() ? code : undefined,
    };
  }

  private async requireLatestUsableCode(
    email: string,
    purpose: "login" | "password_reset",
  ) {
    const latestCode = await this.repository.findLatestEmailLoginCodeByEmail(email, purpose);
    if (!latestCode) {
      throw new AuthAccessError("Verification code is invalid or has expired.");
    }
    if (latestCode.consumedAt) {
      throw new AuthAccessError("Verification code has already been used.");
    }
    if (new Date(latestCode.expiresAt).getTime() <= Date.now()) {
      throw new AuthAccessError("Verification code is invalid or has expired.");
    }
    return latestCode;
  }

  private constantTimeCodeEquals(stored: string, provided: string): boolean {
    const a = Buffer.from(stored);
    const b = Buffer.from(provided);
    return a.length === b.length && timingSafeEqual(a, b);
  }

  private async issueTokens(user: { id: string; email: string; activeWorkspaceId: string | null }): Promise<AuthTokens> {
    const access = createAccessToken({
      userId: user.id,
      email: user.email,
      activeWorkspaceId: user.activeWorkspaceId,
      secret: this.env.JWT_SECRET,
    });
    const refresh = createRefreshToken({
      userId: user.id,
      secret: this.env.JWT_REFRESH_SECRET,
    });

    const session: RefreshSessionRecord = {
      id: refresh.sessionId,
      userId: user.id,
      tokenHash: hashRefreshToken(refresh.token),
      expiresAt: refresh.expiresAt,
      revokedAt: null,
      createdAt: new Date().toISOString(),
    };
    await this.repository.createRefreshSession(session);

    return {
      accessToken: access.token,
      refreshToken: refresh.token,
      expiresInSeconds: access.expiresInSeconds,
    };
  }

  private async requireUser(userId: string) {
    const user = await this.repository.findUserById(userId);
    if (!user || user.status !== "active") {
      throw new AuthAccessError("User not found.");
    }
    return user;
  }

  private async requireMembership(userId: string, workspaceId: string) {
    const membership = await this.repository.findWorkspaceMember(workspaceId, userId);
    const workspace = await this.repository.findWorkspaceById(workspaceId);
    if (!membership || !workspace) {
      throw new AuthAccessError("Workspace is not accessible.");
    }
    return membership;
  }

  private async requireWorkspaceManager(userId: string, workspaceId: string) {
    const membership = await this.requireMembership(userId, workspaceId);
    if (!["owner", "admin"].includes(membership.role)) {
      throw new AuthAccessError("Workspace manager access is required.");
    }
    return membership;
  }

  private async requireWorkspaceInvitation(invitationId: string) {
    const invitation = await this.repository.findWorkspaceInvitationById(invitationId);
    if (!invitation) {
      throw new AuthAccessError("Workspace invitation not found.");
    }
    return invitation;
  }

  private async requireTrialRequest(trialRequestId: string) {
    const record = await this.repository.findTrialRequestById(trialRequestId);
    if (!record) {
      throw new AuthAccessError("Trial request not found.");
    }
    return record;
  }

  private async requireWorkspaceMemberSummary(
    workspaceId: string,
    targetUserId: string,
    currentUserId: string,
  ): Promise<WorkspaceMemberSummary> {
    const membership = await this.repository.findWorkspaceMember(workspaceId, targetUserId);
    const user = await this.repository.findUserById(targetUserId);
    if (!membership || !user) {
      throw new AuthAccessError("Workspace member not found.");
    }

    return {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: membership.role,
      status: user.status,
      joinedAt: membership.createdAt,
      isCurrentUser: user.id === currentUserId,
    };
  }

  private async toInvitationSummary(invitation: {
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
  }): Promise<WorkspaceInvitationSummary> {
    const workspace = await this.repository.findWorkspaceById(invitation.workspaceId);
    const invitedBy = await this.repository.findUserById(invitation.invitedByUserId);
    if (!workspace || !invitedBy) {
      throw new AuthAccessError("Workspace invitation is invalid.");
    }

    return {
      id: invitation.id,
      workspaceId: invitation.workspaceId,
      workspaceName: workspace.name,
      email: invitation.email,
      role: invitation.role,
      status: invitation.status,
      token: invitation.token,
      inviteUrl: this.buildInvitationUrl(invitation.token),
      expiresAt: invitation.expiresAt,
      acceptedAt: invitation.acceptedAt,
      createdAt: invitation.createdAt,
      invitedBy: {
        userId: invitedBy.id,
        name: invitedBy.name,
        email: invitedBy.email,
      },
    };
  }

  private async toInvitationLookup(invitation: {
    id: string;
    workspaceId: string;
    email: string;
    role: WorkspaceInvitationRole;
    token: string;
    status: "pending" | "accepted" | "revoked" | "expired";
    expiresAt: string;
    acceptedAt: string | null;
  }): Promise<WorkspaceInvitationLookup> {
    const workspace = await this.repository.findWorkspaceById(invitation.workspaceId);
    if (!workspace) {
      throw new AuthAccessError("Workspace invitation is invalid.");
    }

    return {
      id: invitation.id,
      workspaceId: invitation.workspaceId,
      workspaceName: workspace.name,
      email: invitation.email,
      role: invitation.role,
      status: invitation.status,
      inviteUrl: this.buildInvitationUrl(invitation.token),
      expiresAt: invitation.expiresAt,
      acceptedAt: invitation.acceptedAt,
    };
  }

  private buildInvitationUrl(token: string): string {
    const baseUrl = this.env.APP_URL.replace(/\/+$/, "");
    return `${baseUrl}/accept-invite?token=${encodeURIComponent(token)}`;
  }

  private async sendWorkspaceInvitationEmail(
    invitation: WorkspaceInvitationSummary,
  ): Promise<void> {
    await this.mailer.sendInvitation({
      invitationId: invitation.id,
      workspaceId: invitation.workspaceId,
      workspaceName: invitation.workspaceName,
      recipientEmail: invitation.email,
      role: invitation.role,
      inviteUrl: invitation.inviteUrl,
      expiresAt: invitation.expiresAt,
      invitedByName: invitation.invitedBy.name,
      invitedByEmail: invitation.invitedBy.email,
      sentAt: new Date().toISOString(),
    });
  }

  private async requirePlatformAdmin(userId: string): Promise<void> {
    const user = await this.repository.findUserById(userId);
    if (!user || user.platformRole !== "platform_admin") {
      throw new AuthAccessError("Platform administrator access required.");
    }
  }

  private async toCustomerWorkspaceSummary(
    workspace: {
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
    },
    preferredInvitation?: WorkspaceInvitationSummary,
  ): Promise<CustomerWorkspaceSummary> {
    let pendingAdminInvite: CustomerWorkspaceSummary["pendingAdminInvite"] = null;

    if (preferredInvitation && preferredInvitation.workspaceId === workspace.id) {
      pendingAdminInvite = {
        email: preferredInvitation.email,
        status: preferredInvitation.status,
        inviteUrl: preferredInvitation.inviteUrl,
        expiresAt: preferredInvitation.expiresAt,
      };
    } else {
      const invitations = await this.repository.listWorkspaceInvitations(workspace.id);
      const pending = invitations.find(
        (item) => item.role === "admin" && item.status === "pending",
      );
      if (pending) {
        const summary = await this.toInvitationSummary(pending);
        pendingAdminInvite = {
          email: summary.email,
          status: summary.status,
          inviteUrl: summary.inviteUrl,
          expiresAt: summary.expiresAt,
        };
      }
    }

    return {
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      website: workspace.website,
      plan: workspace.plan,
      contactName: workspace.contactName,
      contactEmail: workspace.contactEmail,
      contactPhone: workspace.contactPhone,
      provisionedByUserId: workspace.provisionedByUserId,
      createdAt: workspace.createdAt,
      updatedAt: workspace.updatedAt,
      pendingAdminInvite,
    };
  }

  private async toTrialRequestSummary(record: TrialRequestRecord): Promise<TrialRequestSummary> {
    const processedByUser = record.processedByUserId
      ? await this.repository.findUserById(record.processedByUserId)
      : null;
    const approvedWorkspace = record.approvedWorkspaceId
      ? await this.repository.findWorkspaceById(record.approvedWorkspaceId)
      : null;
    const approvedInvitation = record.approvedInvitationId
      ? await this.repository.findWorkspaceInvitationById(record.approvedInvitationId)
      : null;

    return {
      id: record.id,
      companyName: record.companyName,
      contactName: record.contactName,
      email: record.email,
      phone: record.phone,
      website: record.website,
      requirement: record.requirement,
      requestedPlan: record.requestedPlan,
      consentAcceptedAt: record.consentAcceptedAt,
      consentVersion: record.consentVersion,
      status: record.status,
      submittedAt: record.createdAt,
      reviewedAt: record.processedAt,
      reviewNotes: record.reviewNotes,
      processedBy: processedByUser
        ? {
            userId: processedByUser.id,
            name: processedByUser.name,
            email: processedByUser.email,
          }
        : null,
      approvedWorkspace: approvedWorkspace
        ? {
            id: approvedWorkspace.id,
            name: approvedWorkspace.name,
            inviteEmail: approvedInvitation?.email ?? null,
            inviteStatus: approvedInvitation?.status ?? null,
          }
        : null,
    };
  }

  private toUserPayload(user: {
    id: string;
    email: string;
    name: string;
    activeWorkspaceId: string | null;
    platformRole?: "platform_admin" | null;
    mustChangePassword?: boolean;
  }): AuthUserPayload {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      activeWorkspaceId: user.activeWorkspaceId,
      platformRole: user.platformRole ?? null,
      mustChangePassword: user.mustChangePassword ?? false,
    };
  }

  private roleLabel(role: WorkspaceMemberRole): string {
    if (role === "owner") return "所有者";
    if (role === "admin") return "管理员";
    if (role === "member") return "成员";
    return "只读成员";
  }

  private defaultNotificationPrefs() {
    return {
      system: true,
      leads: true,
      quoteStatus: true,
      marketing: false,
    };
  }

  async getAccountSettings(input: {
    userId: string;
    workspaceId: string;
    role: WorkspaceMemberRole;
  }): Promise<AccountSettingsPayload> {
    const user = await this.repository.findUserById(input.userId);
    if (!user) {
      throw new AuthAccessError("User not found.");
    }
    const profile = user.accountProfile ?? {};
    const prefs = {
      ...this.defaultNotificationPrefs(),
      ...(profile.notificationPrefs ?? {}),
    };
    return {
      id: user.id,
      nickname: user.name,
      phone: profile.phone ?? "",
      email: user.email,
      jobTitle: profile.jobTitle ?? "",
      bio: profile.bio ?? "",
      department: profile.department ?? "",
      role: this.roleLabel(input.role),
      lastLogin: new Date(user.updatedAt).toLocaleString("zh-CN"),
      loginIp: "—",
      avatarUrl: typeof profile.avatarUrl === "string" ? profile.avatarUrl : "",
      notificationPrefs: prefs,
      language: profile.language ?? "zh",
    };
  }

  async updateAccountSettings(input: {
    userId: string;
    workspaceId: string;
    role: WorkspaceMemberRole;
    patch: {
      nickname?: string;
      phone?: string;
      email?: string;
      jobTitle?: string;
      bio?: string;
      department?: string;
      avatarUrl?: string;
      notificationPrefs?: UserAccountProfile["notificationPrefs"];
      language?: "zh" | "en";
    };
  }): Promise<AccountSettingsPayload> {
    const user = await this.repository.findUserById(input.userId);
    if (!user) {
      throw new AuthAccessError("User not found.");
    }

    const currentProfile = user.accountProfile ?? {};
    const nextProfile: UserAccountProfile = {
      ...currentProfile,
      phone: input.patch.phone ?? currentProfile.phone,
      jobTitle: input.patch.jobTitle ?? currentProfile.jobTitle,
      bio: input.patch.bio ?? currentProfile.bio,
      department: input.patch.department ?? currentProfile.department,
      language: input.patch.language ?? currentProfile.language ?? "zh",
      avatarUrl:
        input.patch.avatarUrl !== undefined ? input.patch.avatarUrl : currentProfile.avatarUrl,
      notificationPrefs: {
        ...this.defaultNotificationPrefs(),
        ...(currentProfile.notificationPrefs ?? {}),
        ...(input.patch.notificationPrefs ?? {}),
      },
    };

    const nextName = input.patch.nickname?.trim() || user.name;
    if (input.patch.email && input.patch.email.trim() && input.patch.email !== user.email) {
      throw new AuthValidationError("邮箱修改请通过安全设置流程处理。");
    }

    await this.repository.updateUser(user.id, {
      name: nextName,
      accountProfile: nextProfile,
      updatedAt: new Date().toISOString(),
    });

    return this.getAccountSettings({
      userId: input.userId,
      workspaceId: input.workspaceId,
      role: input.role,
    });
  }
}
