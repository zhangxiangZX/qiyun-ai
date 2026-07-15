import { query } from "../db/pg";
import type { AuthRepository } from "./auth.repository";
import type {
  EmailLoginCodeRecord,
  RefreshSessionRecord,
  TrialRequestRecord,
  UserRecord,
  WorkspaceInvitationRecord,
  WorkspaceMemberRecord,
  WorkspaceRecord,
} from "./auth.types";

type QueryFn = <T extends Record<string, unknown> = Record<string, unknown>>(
  text: string,
  values?: unknown[],
) => Promise<T[]>;

function asString(value: unknown): string {
  return typeof value === "string" ? value : String(value ?? "");
}

function asNullableString(value: unknown): string | null {
  return value === null || value === undefined ? null : asString(value);
}

function normalizeDate(value: unknown): string {
  return value instanceof Date ? value.toISOString() : new Date(asString(value)).toISOString();
}

function parseJsonb(value: unknown): Record<string, unknown> {
  if (value === null || value === undefined) return {};
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : {};
    } catch {
      return {};
    }
  }
  if (typeof value === "object") return value as Record<string, unknown>;
  return {};
}

function asJsonb(value: unknown): string {
  if (typeof value === "string") {
    try {
      JSON.parse(value);
      return value;
    } catch {
      return "{}";
    }
  }
  if (value === null || value === undefined) return "{}";
  try {
    return JSON.stringify(value);
  } catch {
    return "{}";
  }
}

function mapUser(row: Record<string, unknown>): UserRecord {
  return {
    id: asString(row.id),
    email: asString(row.email),
    passwordHash: asString(row.password_hash),
    name: asString(row.name),
    status: asString(row.status) as UserRecord["status"],
    activeWorkspaceId: asNullableString(row.active_workspace_id),
    platformRole:
      asNullableString(row.platform_role) === "platform_admin" ? "platform_admin" : null,
    mustChangePassword:
      row.must_change_password === true || row.must_change_password === "t" || row.must_change_password === 1,
    accountProfile: parseJsonb(row.account_profile) as UserRecord["accountProfile"],
    createdAt: normalizeDate(row.created_at),
    updatedAt: normalizeDate(row.updated_at),
  };
}

function mapWorkspace(row: Record<string, unknown>): WorkspaceRecord {
  return {
    id: asString(row.id),
    name: asString(row.name),
    slug: asString(row.slug),
    ownerId: asString(row.owner_id),
    website: asNullableString(row.website),
    plan: asNullableString(row.plan),
    contactName: asNullableString(row.contact_name),
    contactEmail: asNullableString(row.contact_email),
    contactPhone: asNullableString(row.contact_phone),
    provisionedByUserId: asNullableString(row.provisioned_by_user_id),
    companyProfile: parseJsonb(row.company_profile),
    createdAt: normalizeDate(row.created_at),
    updatedAt: normalizeDate(row.updated_at),
  };
}

function mapWorkspaceMember(row: Record<string, unknown>): WorkspaceMemberRecord {
  return {
    workspaceId: asString(row.workspace_id),
    userId: asString(row.user_id),
    role: asString(row.role) as WorkspaceMemberRecord["role"],
    createdAt: normalizeDate(row.created_at),
  };
}

function mapInvitation(row: Record<string, unknown>): WorkspaceInvitationRecord {
  return {
    id: asString(row.id),
    workspaceId: asString(row.workspace_id),
    email: asString(row.email),
    role: asString(row.role) as WorkspaceInvitationRecord["role"],
    invitedByUserId: asString(row.invited_by_user_id),
    token: asString(row.token),
    status: asString(row.status) as WorkspaceInvitationRecord["status"],
    expiresAt: normalizeDate(row.expires_at),
    acceptedAt: row.accepted_at ? normalizeDate(row.accepted_at) : null,
    createdAt: normalizeDate(row.created_at),
    updatedAt: normalizeDate(row.updated_at),
  };
}

function mapRefreshSession(row: Record<string, unknown>): RefreshSessionRecord {
  return {
    id: asString(row.id),
    userId: asString(row.user_id),
    tokenHash: asString(row.token_hash),
    expiresAt: normalizeDate(row.expires_at),
    revokedAt: row.revoked_at ? normalizeDate(row.revoked_at) : null,
    createdAt: normalizeDate(row.created_at),
  };
}

function mapEmailLoginCode(row: Record<string, unknown>): EmailLoginCodeRecord {
  return {
    id: asString(row.id),
    email: asString(row.email),
    purpose: asString(row.purpose) as EmailLoginCodeRecord["purpose"],
    codeHash: asString(row.code_hash),
    expiresAt: normalizeDate(row.expires_at),
    consumedAt: row.consumed_at ? normalizeDate(row.consumed_at) : null,
    createdAt: normalizeDate(row.created_at),
    updatedAt: normalizeDate(row.updated_at),
  };
}

function mapTrialRequest(row: Record<string, unknown>): TrialRequestRecord {
  return {
    id: asString(row.id),
    companyName: asString(row.company_name),
    contactName: asString(row.contact_name),
    email: asString(row.email),
    phone: asNullableString(row.phone),
    website: asNullableString(row.website),
    requirement: asNullableString(row.requirement),
    requestedPlan: asNullableString(row.requested_plan),
    status: asString(row.status) as TrialRequestRecord["status"],
    processedByUserId: asNullableString(row.processed_by_user_id),
    processedAt: row.processed_at ? normalizeDate(row.processed_at) : null,
    reviewNotes: asNullableString(row.review_notes),
    approvedWorkspaceId: asNullableString(row.approved_workspace_id),
    approvedInvitationId: asNullableString(row.approved_invitation_id),
    createdAt: normalizeDate(row.created_at),
    updatedAt: normalizeDate(row.updated_at),
  };
}

export class PostgresAuthRepository implements AuthRepository {
  constructor(private readonly runQuery: QueryFn = query) {}

  async createUser(record: UserRecord): Promise<UserRecord> {
    await this.runQuery(
      `insert into users
       (id, email, password_hash, name, status, active_workspace_id, platform_role, must_change_password, account_profile, created_at, updated_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        record.id,
        record.email,
        record.passwordHash,
        record.name,
        record.status,
        record.activeWorkspaceId,
        record.platformRole,
        record.mustChangePassword ?? false,
        asJsonb(record.accountProfile ?? {}),
        record.createdAt,
        record.updatedAt,
      ],
    );
    return record;
  }

  async updateUser(id: string, patch: Partial<UserRecord>): Promise<UserRecord | null> {
    const current = await this.findUserById(id);
    if (!current) return null;
    const next = { ...current, ...patch };
    const rows = await this.runQuery(
      `update users
       set email = $2,
           password_hash = $3,
           name = $4,
           status = $5,
           active_workspace_id = $6,
           platform_role = $7,
           must_change_password = $8,
           account_profile = $9,
           created_at = $10,
           updated_at = $11
       where id = $1
       returning *`,
      [
        id,
        next.email,
        next.passwordHash,
        next.name,
        next.status,
        next.activeWorkspaceId,
        next.platformRole,
        next.mustChangePassword ?? false,
        asJsonb(next.accountProfile ?? {}),
        next.createdAt,
        next.updatedAt,
      ],
    );
    return rows[0] ? mapUser(rows[0]) : null;
  }

  async findUserById(id: string): Promise<UserRecord | null> {
    const rows = await this.runQuery(`select * from users where id = $1 limit 1`, [id]);
    return rows[0] ? mapUser(rows[0]) : null;
  }

  async findUserByEmail(email: string): Promise<UserRecord | null> {
    const rows = await this.runQuery(`select * from users where lower(email) = lower($1) limit 1`, [email]);
    return rows[0] ? mapUser(rows[0]) : null;
  }

  async createWorkspace(record: WorkspaceRecord): Promise<WorkspaceRecord> {
    await this.runQuery(
      `insert into workspaces
       (id, name, slug, owner_id, website, plan, contact_name, contact_email, contact_phone, provisioned_by_user_id, created_at, updated_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [
        record.id,
        record.name,
        record.slug,
        record.ownerId,
        record.website,
        record.plan,
        record.contactName,
        record.contactEmail,
        record.contactPhone,
        record.provisionedByUserId,
        record.createdAt,
        record.updatedAt,
      ],
    );
    return record;
  }

  async updateWorkspace(id: string, patch: Partial<WorkspaceRecord>): Promise<WorkspaceRecord | null> {
    const current = await this.findWorkspaceById(id);
    if (!current) return null;
    const next = { ...current, ...patch };
    const rows = await this.runQuery(
      `update workspaces
       set name = $2,
           slug = $3,
           owner_id = $4,
           website = $5,
           plan = $6,
           contact_name = $7,
           contact_email = $8,
           contact_phone = $9,
           provisioned_by_user_id = $10,
           company_profile = $11,
           created_at = $12,
           updated_at = $13
       where id = $1
       returning *`,
      [
        id,
        next.name,
        next.slug,
        next.ownerId,
        next.website,
        next.plan,
        next.contactName,
        next.contactEmail,
        next.contactPhone,
        next.provisionedByUserId,
        asJsonb(next.companyProfile),
        next.createdAt,
        next.updatedAt,
      ],
    );
    return rows[0] ? mapWorkspace(rows[0]) : null;
  }

  async findWorkspaceById(id: string): Promise<WorkspaceRecord | null> {
    const rows = await this.runQuery(`select * from workspaces where id = $1 limit 1`, [id]);
    return rows[0] ? mapWorkspace(rows[0]) : null;
  }

  async findWorkspaceBySlug(slug: string): Promise<WorkspaceRecord | null> {
    const rows = await this.runQuery(
      `select * from workspaces where lower(slug) = lower($1) limit 1`,
      [slug],
    );
    return rows[0] ? mapWorkspace(rows[0]) : null;
  }

  async listWorkspaces(): Promise<WorkspaceRecord[]> {
    const rows = await this.runQuery(`select * from workspaces order by created_at asc`);
    return rows.map(mapWorkspace);
  }

  async upsertWorkspaceMember(record: WorkspaceMemberRecord): Promise<WorkspaceMemberRecord> {
    const rows = await this.runQuery(
      `insert into workspace_members
       (workspace_id, user_id, role, created_at)
       values ($1,$2,$3,$4)
       on conflict (workspace_id, user_id) do update set
         role = excluded.role,
         created_at = excluded.created_at
       returning *`,
      [record.workspaceId, record.userId, record.role, record.createdAt],
    );
    return mapWorkspaceMember(rows[0]!);
  }

  async findWorkspaceMember(
    workspaceId: string,
    userId: string,
  ): Promise<WorkspaceMemberRecord | null> {
    const rows = await this.runQuery(
      `select * from workspace_members where workspace_id = $1 and user_id = $2 limit 1`,
      [workspaceId, userId],
    );
    return rows[0] ? mapWorkspaceMember(rows[0]) : null;
  }

  async listWorkspaceMembersByUser(userId: string): Promise<WorkspaceMemberRecord[]> {
    const rows = await this.runQuery(
      `select * from workspace_members where user_id = $1 order by created_at asc`,
      [userId],
    );
    return rows.map(mapWorkspaceMember);
  }

  async listWorkspaceMembers(workspaceId: string): Promise<WorkspaceMemberRecord[]> {
    const rows = await this.runQuery(
      `select * from workspace_members where workspace_id = $1 order by created_at asc`,
      [workspaceId],
    );
    return rows.map(mapWorkspaceMember);
  }

  async removeWorkspaceMember(workspaceId: string, userId: string): Promise<boolean> {
    const rows = await this.runQuery(
      `delete from workspace_members where workspace_id = $1 and user_id = $2 returning user_id`,
      [workspaceId, userId],
    );
    return rows.length > 0;
  }

  async createWorkspaceInvitation(record: WorkspaceInvitationRecord): Promise<WorkspaceInvitationRecord> {
    await this.runQuery(
      `insert into workspace_invitations
       (id, workspace_id, email, role, invited_by_user_id, token, status, expires_at, accepted_at, created_at, updated_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        record.id,
        record.workspaceId,
        record.email,
        record.role,
        record.invitedByUserId,
        record.token,
        record.status,
        record.expiresAt,
        record.acceptedAt,
        record.createdAt,
        record.updatedAt,
      ],
    );
    return record;
  }

  async updateWorkspaceInvitation(
    id: string,
    patch: Partial<WorkspaceInvitationRecord>,
  ): Promise<WorkspaceInvitationRecord | null> {
    const current = await this.findWorkspaceInvitationById(id);
    if (!current) return null;
    const next = { ...current, ...patch };
    const rows = await this.runQuery(
      `update workspace_invitations
       set workspace_id = $2,
           email = $3,
           role = $4,
           invited_by_user_id = $5,
           token = $6,
           status = $7,
           expires_at = $8,
           accepted_at = $9,
           created_at = $10,
           updated_at = $11
       where id = $1
       returning *`,
      [
        id,
        next.workspaceId,
        next.email,
        next.role,
        next.invitedByUserId,
        next.token,
        next.status,
        next.expiresAt,
        next.acceptedAt,
        next.createdAt,
        next.updatedAt,
      ],
    );
    return rows[0] ? mapInvitation(rows[0]) : null;
  }

  async findWorkspaceInvitationById(id: string): Promise<WorkspaceInvitationRecord | null> {
    const rows = await this.runQuery(`select * from workspace_invitations where id = $1 limit 1`, [id]);
    return rows[0] ? mapInvitation(rows[0]) : null;
  }

  async findWorkspaceInvitationByToken(token: string): Promise<WorkspaceInvitationRecord | null> {
    const rows = await this.runQuery(
      `select * from workspace_invitations where token = $1 limit 1`,
      [token],
    );
    return rows[0] ? mapInvitation(rows[0]) : null;
  }

  async listWorkspaceInvitations(workspaceId: string): Promise<WorkspaceInvitationRecord[]> {
    const rows = await this.runQuery(
      `select * from workspace_invitations where workspace_id = $1 order by created_at desc`,
      [workspaceId],
    );
    return rows.map(mapInvitation);
  }

  async findPendingWorkspaceInvitationByEmail(
    workspaceId: string,
    email: string,
  ): Promise<WorkspaceInvitationRecord | null> {
    const rows = await this.runQuery(
      `select * from workspace_invitations
       where workspace_id = $1 and lower(email) = lower($2) and status = 'pending'
       order by created_at desc
       limit 1`,
      [workspaceId, email],
    );
    return rows[0] ? mapInvitation(rows[0]) : null;
  }

  async createRefreshSession(record: RefreshSessionRecord): Promise<RefreshSessionRecord> {
    await this.runQuery(
      `insert into refresh_sessions
       (id, user_id, token_hash, expires_at, revoked_at, created_at)
       values ($1,$2,$3,$4,$5,$6)`,
      [
        record.id,
        record.userId,
        record.tokenHash,
        record.expiresAt,
        record.revokedAt,
        record.createdAt,
      ],
    );
    return record;
  }

  async findRefreshSessionByHash(tokenHash: string): Promise<RefreshSessionRecord | null> {
    const rows = await this.runQuery(
      `select * from refresh_sessions where token_hash = $1 limit 1`,
      [tokenHash],
    );
    return rows[0] ? mapRefreshSession(rows[0]) : null;
  }

  async revokeRefreshSession(id: string, revokedAt: string): Promise<RefreshSessionRecord | null> {
    const rows = await this.runQuery(
      `update refresh_sessions
       set revoked_at = $2
       where id = $1
       returning *`,
      [id, revokedAt],
    );
    return rows[0] ? mapRefreshSession(rows[0]) : null;
  }

  async createEmailLoginCode(record: EmailLoginCodeRecord): Promise<EmailLoginCodeRecord> {
    await this.runQuery(
      `insert into email_login_codes
       (id, email, purpose, code_hash, expires_at, consumed_at, created_at, updated_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        record.id,
        record.email,
        record.purpose,
        record.codeHash,
        record.expiresAt,
        record.consumedAt,
        record.createdAt,
        record.updatedAt,
      ],
    );
    return record;
  }

  async findLatestEmailLoginCodeByEmail(
    email: string,
    purpose: EmailLoginCodeRecord["purpose"],
  ): Promise<EmailLoginCodeRecord | null> {
    const rows = await this.runQuery(
      `select * from email_login_codes
       where lower(email) = lower($1) and purpose = $2
       order by created_at desc
       limit 1`,
      [email, purpose],
    );
    return rows[0] ? mapEmailLoginCode(rows[0]) : null;
  }

  async consumeEmailLoginCode(id: string, consumedAt: string): Promise<EmailLoginCodeRecord | null> {
    const rows = await this.runQuery(
      `update email_login_codes
       set consumed_at = $2,
           updated_at = $2
       where id = $1
       returning *`,
      [id, consumedAt],
    );
    return rows[0] ? mapEmailLoginCode(rows[0]) : null;
  }

  async createTrialRequest(record: TrialRequestRecord): Promise<TrialRequestRecord> {
    await this.runQuery(
      `insert into trial_requests
       (id, company_name, contact_name, email, phone, website, requirement, requested_plan, status,
        processed_by_user_id, processed_at, review_notes, approved_workspace_id, approved_invitation_id,
        created_at, updated_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
      [
        record.id,
        record.companyName,
        record.contactName,
        record.email,
        record.phone,
        record.website,
        record.requirement,
        record.requestedPlan,
        record.status,
        record.processedByUserId,
        record.processedAt,
        record.reviewNotes,
        record.approvedWorkspaceId,
        record.approvedInvitationId,
        record.createdAt,
        record.updatedAt,
      ],
    );
    return record;
  }

  async updateTrialRequest(id: string, patch: Partial<TrialRequestRecord>): Promise<TrialRequestRecord | null> {
    const current = await this.findTrialRequestById(id);
    if (!current) return null;
    const next = { ...current, ...patch };
    const rows = await this.runQuery(
      `update trial_requests
       set company_name = $2,
           contact_name = $3,
           email = $4,
           phone = $5,
           website = $6,
           requirement = $7,
           requested_plan = $8,
           status = $9,
           processed_by_user_id = $10,
           processed_at = $11,
           review_notes = $12,
           approved_workspace_id = $13,
           approved_invitation_id = $14,
           created_at = $15,
           updated_at = $16
       where id = $1
       returning *`,
      [
        id,
        next.companyName,
        next.contactName,
        next.email,
        next.phone,
        next.website,
        next.requirement,
        next.requestedPlan,
        next.status,
        next.processedByUserId,
        next.processedAt,
        next.reviewNotes,
        next.approvedWorkspaceId,
        next.approvedInvitationId,
        next.createdAt,
        next.updatedAt,
      ],
    );
    return rows[0] ? mapTrialRequest(rows[0]) : null;
  }

  async findTrialRequestById(id: string): Promise<TrialRequestRecord | null> {
    const rows = await this.runQuery(`select * from trial_requests where id = $1 limit 1`, [id]);
    return rows[0] ? mapTrialRequest(rows[0]) : null;
  }

  async listTrialRequests(): Promise<TrialRequestRecord[]> {
    const rows = await this.runQuery(`select * from trial_requests order by created_at desc`);
    return rows.map(mapTrialRequest);
  }

  async findPendingTrialRequestByEmail(email: string): Promise<TrialRequestRecord | null> {
    const rows = await this.runQuery(
      `select * from trial_requests
       where lower(email) = lower($1) and status = 'pending'
       order by created_at desc
       limit 1`,
      [email],
    );
    return rows[0] ? mapTrialRequest(rows[0]) : null;
  }
}
