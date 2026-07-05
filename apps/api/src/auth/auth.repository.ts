import type {
  EmailLoginCodeRecord,
  RefreshSessionRecord,
  TrialRequestRecord,
  UserRecord,
  WorkspaceInvitationRecord,
  WorkspaceMemberRecord,
  WorkspaceRecord,
} from "./auth.types";

export interface AuthRepository {
  createUser(record: UserRecord): Promise<UserRecord>;
  updateUser(id: string, patch: Partial<UserRecord>): Promise<UserRecord | null>;
  findUserById(id: string): Promise<UserRecord | null>;
  findUserByEmail(email: string): Promise<UserRecord | null>;
  createWorkspace(record: WorkspaceRecord): Promise<WorkspaceRecord>;
  updateWorkspace(id: string, patch: Partial<WorkspaceRecord>): Promise<WorkspaceRecord | null>;
  findWorkspaceById(id: string): Promise<WorkspaceRecord | null>;
  findWorkspaceBySlug(slug: string): Promise<WorkspaceRecord | null>;
  listWorkspaces(): Promise<WorkspaceRecord[]>;
  upsertWorkspaceMember(record: WorkspaceMemberRecord): Promise<WorkspaceMemberRecord>;
  findWorkspaceMember(
    workspaceId: string,
    userId: string,
  ): Promise<WorkspaceMemberRecord | null>;
  listWorkspaceMembersByUser(userId: string): Promise<WorkspaceMemberRecord[]>;
  listWorkspaceMembers(workspaceId: string): Promise<WorkspaceMemberRecord[]>;
  removeWorkspaceMember(workspaceId: string, userId: string): Promise<boolean>;
  createWorkspaceInvitation(record: WorkspaceInvitationRecord): Promise<WorkspaceInvitationRecord>;
  updateWorkspaceInvitation(
    id: string,
    patch: Partial<WorkspaceInvitationRecord>,
  ): Promise<WorkspaceInvitationRecord | null>;
  findWorkspaceInvitationById(id: string): Promise<WorkspaceInvitationRecord | null>;
  findWorkspaceInvitationByToken(token: string): Promise<WorkspaceInvitationRecord | null>;
  listWorkspaceInvitations(workspaceId: string): Promise<WorkspaceInvitationRecord[]>;
  findPendingWorkspaceInvitationByEmail(
    workspaceId: string,
    email: string,
  ): Promise<WorkspaceInvitationRecord | null>;
  createRefreshSession(record: RefreshSessionRecord): Promise<RefreshSessionRecord>;
  findRefreshSessionByHash(tokenHash: string): Promise<RefreshSessionRecord | null>;
  revokeRefreshSession(id: string, revokedAt: string): Promise<RefreshSessionRecord | null>;
  createEmailLoginCode(record: EmailLoginCodeRecord): Promise<EmailLoginCodeRecord>;
  findLatestEmailLoginCodeByEmail(
    email: string,
    purpose: EmailLoginCodeRecord["purpose"],
  ): Promise<EmailLoginCodeRecord | null>;
  consumeEmailLoginCode(id: string, consumedAt: string): Promise<EmailLoginCodeRecord | null>;
  createTrialRequest(record: TrialRequestRecord): Promise<TrialRequestRecord>;
  updateTrialRequest(id: string, patch: Partial<TrialRequestRecord>): Promise<TrialRequestRecord | null>;
  findTrialRequestById(id: string): Promise<TrialRequestRecord | null>;
  listTrialRequests(): Promise<TrialRequestRecord[]>;
  findPendingTrialRequestByEmail(email: string): Promise<TrialRequestRecord | null>;
}

export class InMemoryAuthRepository implements AuthRepository {
  private readonly users = new Map<string, UserRecord>();
  private readonly usersByEmail = new Map<string, UserRecord>();
  private readonly workspaces = new Map<string, WorkspaceRecord>();
  private readonly workspaceMembers = new Map<string, WorkspaceMemberRecord>();
  private readonly workspaceInvitations = new Map<string, WorkspaceInvitationRecord>();
  private readonly workspaceInvitationsByToken = new Map<string, WorkspaceInvitationRecord>();
  private readonly refreshSessions = new Map<string, RefreshSessionRecord>();
  private readonly refreshSessionsByHash = new Map<string, RefreshSessionRecord>();
  private readonly emailLoginCodes = new Map<string, EmailLoginCodeRecord>();
  private readonly trialRequests = new Map<string, TrialRequestRecord>();

  loadSnapshot(input: {
    users: UserRecord[];
    workspaces: WorkspaceRecord[];
    workspaceMembers: WorkspaceMemberRecord[];
    workspaceInvitations: WorkspaceInvitationRecord[];
    refreshSessions: RefreshSessionRecord[];
    emailLoginCodes: EmailLoginCodeRecord[];
    trialRequests: TrialRequestRecord[];
  }): void {
    this.users.clear();
    this.usersByEmail.clear();
    this.workspaces.clear();
    this.workspaceMembers.clear();
    this.workspaceInvitations.clear();
    this.workspaceInvitationsByToken.clear();
    this.refreshSessions.clear();
    this.refreshSessionsByHash.clear();
    this.emailLoginCodes.clear();
    this.trialRequests.clear();

    for (const user of input.users) {
      this.users.set(user.id, user);
      this.usersByEmail.set(user.email.toLowerCase(), user);
    }
    for (const workspace of input.workspaces) {
      this.workspaces.set(workspace.id, workspace);
    }
    for (const member of input.workspaceMembers) {
      this.workspaceMembers.set(`${member.workspaceId}:${member.userId}`, member);
    }
    for (const invitation of input.workspaceInvitations) {
      this.workspaceInvitations.set(invitation.id, invitation);
      this.workspaceInvitationsByToken.set(invitation.token, invitation);
    }
    for (const session of input.refreshSessions) {
      this.refreshSessions.set(session.id, session);
      this.refreshSessionsByHash.set(session.tokenHash, session);
    }
    for (const code of input.emailLoginCodes) {
      this.emailLoginCodes.set(code.id, code);
    }
    for (const request of input.trialRequests) {
      this.trialRequests.set(request.id, request);
    }
  }

  dumpSnapshot(): {
    users: UserRecord[];
    workspaces: WorkspaceRecord[];
    workspaceMembers: WorkspaceMemberRecord[];
    workspaceInvitations: WorkspaceInvitationRecord[];
    refreshSessions: RefreshSessionRecord[];
    emailLoginCodes: EmailLoginCodeRecord[];
    trialRequests: TrialRequestRecord[];
  } {
    return {
      users: [...this.users.values()],
      workspaces: [...this.workspaces.values()],
      workspaceMembers: [...this.workspaceMembers.values()],
      workspaceInvitations: [...this.workspaceInvitations.values()],
      refreshSessions: [...this.refreshSessions.values()],
      emailLoginCodes: [...this.emailLoginCodes.values()],
      trialRequests: [...this.trialRequests.values()],
    };
  }

  async createUser(record: UserRecord): Promise<UserRecord> {
    this.users.set(record.id, record);
    this.usersByEmail.set(record.email.toLowerCase(), record);
    return record;
  }

  async updateUser(id: string, patch: Partial<UserRecord>): Promise<UserRecord | null> {
    const current = this.users.get(id);
    if (!current) {
      return null;
    }

    if (patch.email && patch.email.toLowerCase() !== current.email.toLowerCase()) {
      this.usersByEmail.delete(current.email.toLowerCase());
    }

    const next = { ...current, ...patch };
    this.users.set(id, next);
    this.usersByEmail.set(next.email.toLowerCase(), next);
    return next;
  }

  async findUserById(id: string): Promise<UserRecord | null> {
    return this.users.get(id) ?? null;
  }

  async findUserByEmail(email: string): Promise<UserRecord | null> {
    return this.usersByEmail.get(email.toLowerCase()) ?? null;
  }

  async createWorkspace(record: WorkspaceRecord): Promise<WorkspaceRecord> {
    this.workspaces.set(record.id, record);
    return record;
  }

  async updateWorkspace(id: string, patch: Partial<WorkspaceRecord>): Promise<WorkspaceRecord | null> {
    const current = this.workspaces.get(id);
    if (!current) {
      return null;
    }

    const next = { ...current, ...patch };
    this.workspaces.set(id, next);
    return next;
  }

  async findWorkspaceById(id: string): Promise<WorkspaceRecord | null> {
    return this.workspaces.get(id) ?? null;
  }

  async findWorkspaceBySlug(slug: string): Promise<WorkspaceRecord | null> {
    return (
      [...this.workspaces.values()].find(
        (workspace) => workspace.slug.toLowerCase() === slug.toLowerCase(),
      ) ?? null
    );
  }

  async listWorkspaces(): Promise<WorkspaceRecord[]> {
    return [...this.workspaces.values()];
  }

  async upsertWorkspaceMember(record: WorkspaceMemberRecord): Promise<WorkspaceMemberRecord> {
    this.workspaceMembers.set(`${record.workspaceId}:${record.userId}`, record);
    return record;
  }

  async findWorkspaceMember(
    workspaceId: string,
    userId: string,
  ): Promise<WorkspaceMemberRecord | null> {
    return this.workspaceMembers.get(`${workspaceId}:${userId}`) ?? null;
  }

  async listWorkspaceMembersByUser(userId: string): Promise<WorkspaceMemberRecord[]> {
    return [...this.workspaceMembers.values()].filter((member) => member.userId === userId);
  }

  async listWorkspaceMembers(workspaceId: string): Promise<WorkspaceMemberRecord[]> {
    return [...this.workspaceMembers.values()].filter((member) => member.workspaceId === workspaceId);
  }

  async removeWorkspaceMember(workspaceId: string, userId: string): Promise<boolean> {
    return this.workspaceMembers.delete(`${workspaceId}:${userId}`);
  }

  async createWorkspaceInvitation(record: WorkspaceInvitationRecord): Promise<WorkspaceInvitationRecord> {
    this.workspaceInvitations.set(record.id, record);
    this.workspaceInvitationsByToken.set(record.token, record);
    return record;
  }

  async updateWorkspaceInvitation(
    id: string,
    patch: Partial<WorkspaceInvitationRecord>,
  ): Promise<WorkspaceInvitationRecord | null> {
    const current = this.workspaceInvitations.get(id);
    if (!current) {
      return null;
    }

    if (patch.token && patch.token !== current.token) {
      this.workspaceInvitationsByToken.delete(current.token);
    }

    const next = { ...current, ...patch };
    this.workspaceInvitations.set(id, next);
    this.workspaceInvitationsByToken.set(next.token, next);
    return next;
  }

  async findWorkspaceInvitationById(id: string): Promise<WorkspaceInvitationRecord | null> {
    return this.workspaceInvitations.get(id) ?? null;
  }

  async findWorkspaceInvitationByToken(token: string): Promise<WorkspaceInvitationRecord | null> {
    return this.workspaceInvitationsByToken.get(token) ?? null;
  }

  async listWorkspaceInvitations(workspaceId: string): Promise<WorkspaceInvitationRecord[]> {
    return [...this.workspaceInvitations.values()].filter(
      (invitation) => invitation.workspaceId === workspaceId,
    );
  }

  async findPendingWorkspaceInvitationByEmail(
    workspaceId: string,
    email: string,
  ): Promise<WorkspaceInvitationRecord | null> {
    return (
      [...this.workspaceInvitations.values()].find(
        (invitation) =>
          invitation.workspaceId === workspaceId &&
          invitation.email.toLowerCase() === email.toLowerCase() &&
          invitation.status === "pending",
      ) ?? null
    );
  }

  async createRefreshSession(record: RefreshSessionRecord): Promise<RefreshSessionRecord> {
    this.refreshSessions.set(record.id, record);
    this.refreshSessionsByHash.set(record.tokenHash, record);
    return record;
  }

  async findRefreshSessionByHash(tokenHash: string): Promise<RefreshSessionRecord | null> {
    return this.refreshSessionsByHash.get(tokenHash) ?? null;
  }

  async revokeRefreshSession(id: string, revokedAt: string): Promise<RefreshSessionRecord | null> {
    const current = this.refreshSessions.get(id);
    if (!current) {
      return null;
    }
    const next = { ...current, revokedAt };
    this.refreshSessions.set(id, next);
    this.refreshSessionsByHash.set(next.tokenHash, next);
    return next;
  }

  async createEmailLoginCode(record: EmailLoginCodeRecord): Promise<EmailLoginCodeRecord> {
    this.emailLoginCodes.set(record.id, record);
    return record;
  }

  async findLatestEmailLoginCodeByEmail(
    email: string,
    purpose: EmailLoginCodeRecord["purpose"],
  ): Promise<EmailLoginCodeRecord | null> {
    return (
      [...this.emailLoginCodes.values()]
        .filter(
          (record) =>
            record.email.toLowerCase() === email.toLowerCase() && record.purpose === purpose,
        )
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0] ?? null
    );
  }

  async consumeEmailLoginCode(id: string, consumedAt: string): Promise<EmailLoginCodeRecord | null> {
    const current = this.emailLoginCodes.get(id);
    if (!current) {
      return null;
    }

    const next = {
      ...current,
      consumedAt,
      updatedAt: consumedAt,
    };
    this.emailLoginCodes.set(id, next);
    return next;
  }

  async createTrialRequest(record: TrialRequestRecord): Promise<TrialRequestRecord> {
    this.trialRequests.set(record.id, record);
    return record;
  }

  async updateTrialRequest(id: string, patch: Partial<TrialRequestRecord>): Promise<TrialRequestRecord | null> {
    const current = this.trialRequests.get(id);
    if (!current) {
      return null;
    }
    const next = { ...current, ...patch };
    this.trialRequests.set(id, next);
    return next;
  }

  async findTrialRequestById(id: string): Promise<TrialRequestRecord | null> {
    return this.trialRequests.get(id) ?? null;
  }

  async listTrialRequests(): Promise<TrialRequestRecord[]> {
    return [...this.trialRequests.values()];
  }

  async findPendingTrialRequestByEmail(email: string): Promise<TrialRequestRecord | null> {
    return (
      [...this.trialRequests.values()]
        .filter(
          (request) =>
            request.email.toLowerCase() === email.toLowerCase() && request.status === "pending",
        )
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0] ?? null
    );
  }
}
