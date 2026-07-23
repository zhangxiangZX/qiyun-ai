import type { PoolClient } from "./pg";
import type { InMemoryAuthRepository } from "../auth/auth.repository";
import type {
  EmailLoginCodeRecord,
  RefreshSessionRecord,
  TrialRequestRecord,
  UserRecord,
  WorkspaceInvitationRecord,
  WorkspaceMemberRecord,
  WorkspaceRecord,
} from "../auth/auth.types";
import type { InMemoryDocumentRepository } from "../documents/document.repository";
import type {
  DocumentRecord,
  KnowledgeBaseRecord,
} from "../documents/document.types";
import type { InMemoryRagRepository } from "../rag/rag.repository";
import { normalizeBotRecord } from "../rag/bot-defaults";
import type { BotRecord, ChunkRecord } from "../rag/rag.types";
import { withClient } from "./pg";

const SNAPSHOT_STATE_KEY = "snapshot-store";

type QueryResultRow = Record<string, unknown>;

function toJson<T>(value: T): string {
  return JSON.stringify(value);
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : String(value ?? "");
}

function asNullableString(value: unknown): string | null {
  return value === null || value === undefined ? null : asString(value);
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => asString(item)) : [];
}

function asNumberArray(value: unknown): number[] {
  return Array.isArray(value)
    ? value.map((item) => Number(item)).filter((item) => Number.isFinite(item))
    : [];
}

function normalizeDate(value: Date | string | null): string | null {
  if (value === null) {
    return null;
  }
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
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

function mapKnowledgeBase(row: QueryResultRow): KnowledgeBaseRecord {
  return {
    id: asString(row.id),
    workspaceId: asString(row.workspace_id),
    name: asString(row.name),
    status: asString(row.status) as KnowledgeBaseRecord["status"],
    createdAt: normalizeDate(row.created_at as Date | string)!,
    updatedAt: normalizeDate(row.updated_at as Date | string)!,
    deletedAt: normalizeDate((row.deleted_at ?? null) as Date | string | null),
  };
}

function mapUser(row: QueryResultRow): UserRecord {
  return {
    id: asString(row.id),
    email: asString(row.email),
    passwordHash: asString(row.password_hash),
    name: asString(row.name),
    status: asString(row.status) as UserRecord["status"],
    activeWorkspaceId: asNullableString(row.active_workspace_id),
    platformRole:
      asNullableString(row.platform_role) === "platform_admin" ? "platform_admin" : null,
    accountProfile: parseJsonb(row.account_profile) as UserRecord["accountProfile"],
    createdAt: normalizeDate(row.created_at as Date | string)!,
    updatedAt: normalizeDate(row.updated_at as Date | string)!,
  };
}

function mapWorkspace(row: QueryResultRow): WorkspaceRecord {
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
    createdAt: normalizeDate(row.created_at as Date | string)!,
    updatedAt: normalizeDate(row.updated_at as Date | string)!,
  };
}

function mapWorkspaceMember(row: QueryResultRow): WorkspaceMemberRecord {
  return {
    workspaceId: asString(row.workspace_id),
    userId: asString(row.user_id),
    role: asString(row.role) as WorkspaceMemberRecord["role"],
    createdAt: normalizeDate(row.created_at as Date | string)!,
  };
}

function mapRefreshSession(row: QueryResultRow): RefreshSessionRecord {
  return {
    id: asString(row.id),
    userId: asString(row.user_id),
    tokenHash: asString(row.token_hash),
    expiresAt: normalizeDate(row.expires_at as Date | string)!,
    revokedAt: normalizeDate((row.revoked_at ?? null) as Date | string | null),
    createdAt: normalizeDate(row.created_at as Date | string)!,
  };
}

function mapEmailLoginCode(row: QueryResultRow): EmailLoginCodeRecord {
  return {
    id: asString(row.id),
    email: asString(row.email),
    purpose: asString(row.purpose) as EmailLoginCodeRecord["purpose"],
    codeHash: asString(row.code_hash),
    expiresAt: normalizeDate(row.expires_at as Date | string)!,
    consumedAt: normalizeDate((row.consumed_at ?? null) as Date | string | null),
    createdAt: normalizeDate(row.created_at as Date | string)!,
    updatedAt: normalizeDate(row.updated_at as Date | string)!,
  };
}

function mapWorkspaceInvitation(row: QueryResultRow): WorkspaceInvitationRecord {
  return {
    id: asString(row.id),
    workspaceId: asString(row.workspace_id),
    email: asString(row.email),
    role: asString(row.role) as WorkspaceInvitationRecord["role"],
    invitedByUserId: asString(row.invited_by_user_id),
    token: asString(row.token),
    status: asString(row.status) as WorkspaceInvitationRecord["status"],
    expiresAt: normalizeDate(row.expires_at as Date | string)!,
    acceptedAt: normalizeDate((row.accepted_at ?? null) as Date | string | null),
    createdAt: normalizeDate(row.created_at as Date | string)!,
    updatedAt: normalizeDate(row.updated_at as Date | string)!,
  };
}

function mapTrialRequest(row: QueryResultRow): TrialRequestRecord {
  return {
    id: asString(row.id),
    companyName: asString(row.company_name),
    contactName: asString(row.contact_name),
    email: asString(row.email),
    phone: asNullableString(row.phone),
    website: asNullableString(row.website),
    requirement: asNullableString(row.requirement),
    requestedPlan: asNullableString(row.requested_plan),
    consentAcceptedAt: normalizeDate((row.consent_accepted_at ?? null) as Date | string | null),
    consentVersion: asNullableString(row.consent_version),
    status: asString(row.status) as TrialRequestRecord["status"],
    processedByUserId: asNullableString(row.processed_by_user_id),
    processedAt: normalizeDate((row.processed_at ?? null) as Date | string | null),
    reviewNotes: asNullableString(row.review_notes),
    approvedWorkspaceId: asNullableString(row.approved_workspace_id),
    approvedInvitationId: asNullableString(row.approved_invitation_id),
    createdAt: normalizeDate(row.created_at as Date | string)!,
    updatedAt: normalizeDate(row.updated_at as Date | string)!,
  };
}

function mapDocument(row: QueryResultRow): DocumentRecord {
  return {
    id: asString(row.id),
    workspaceId: asString(row.workspace_id),
    knowledgeBaseId: asString(row.knowledge_base_id),
    fileName: asString(row.file_name),
    fileType: asString(row.file_type),
    storageKey: asString(row.storage_key),
    sizeBytes: Number(row.size_bytes),
    status: asString(row.status) as DocumentRecord["status"],
    chunkCount: (row.chunk_count as number | null) ?? null,
    errorCode: asNullableString(row.error_code) as DocumentRecord["errorCode"],
    errorMessage: asNullableString(row.error_message),
    contentHash: asNullableString(row.content_hash),
    createdAt: normalizeDate(row.created_at as Date | string)!,
    updatedAt: normalizeDate(row.updated_at as Date | string)!,
    deletedAt: normalizeDate((row.deleted_at ?? null) as Date | string | null),
  };
}

function mapBot(row: QueryResultRow): BotRecord {
  return normalizeBotRecord({
    id: asString(row.id),
    workspaceId: asString(row.workspace_id),
    name: asString(row.name),
    status: asString(row.status) as BotRecord["status"],
    knowledgeBaseIds: asStringArray(row.knowledge_base_ids),
    description: row.description === undefined ? undefined : asString(row.description),
    welcomeMessage:
      row.welcome_message === undefined ? undefined : asString(row.welcome_message),
    recommendedQuestions:
      row.recommended_questions === undefined
        ? undefined
        : asStringArray(row.recommended_questions),
    systemPrompt:
      row.system_prompt === undefined ? undefined : asString(row.system_prompt),
    collectLeadsOnFailure:
      row.collect_leads_on_failure === undefined
        ? undefined
        : Boolean(row.collect_leads_on_failure),
    rateLimitPerMinute:
      row.rate_limit_per_minute === undefined
        ? undefined
        : Number(row.rate_limit_per_minute),
    allowedDomains:
      row.allowed_domains === undefined
        ? undefined
        : asStringArray(row.allowed_domains),
    leadFields:
      row.lead_fields === undefined ? undefined : asStringArray(row.lead_fields),
    llmTemperature:
      row.llm_temperature === undefined ? undefined : Number(row.llm_temperature),
    maxOutputTokens:
      row.max_output_tokens === undefined ? undefined : Number(row.max_output_tokens),
    updatedAt:
      row.updated_at === undefined
        ? undefined
        : normalizeDate(row.updated_at as Date | string)!,
  });
}

function mapChunk(row: QueryResultRow): ChunkRecord {
  return {
    id: asString(row.id),
    workspaceId: asString(row.workspace_id),
    knowledgeBaseId: asString(row.knowledge_base_id),
    documentId: asString(row.document_id),
    documentTitle: asString(row.document_title),
    content: asString(row.content),
    sectionTitle: asNullableString(row.section_title),
    chunkIndex:
      row.chunk_index === null || row.chunk_index === undefined
        ? null
        : Number(row.chunk_index),
    embedding: asNumberArray(row.embedding),
  };
}

export async function upsertBotsToPostgres(bots: BotRecord[]): Promise<void> {
  if (bots.length === 0) {
    return;
  }

  await withClient(async (client) => {
    for (const bot of bots) {
      await client.query(
        `insert into bots (
           id, workspace_id, name, status, knowledge_base_ids,
           description, welcome_message, system_prompt, recommended_questions,
           collect_leads_on_failure, rate_limit_per_minute,
           allowed_domains, lead_fields, llm_temperature, max_output_tokens, updated_at
         )
         values ($1,$2,$3,$4,$5::jsonb,$6,$7,$8,$9::jsonb,$10,$11,$12::jsonb,$13::jsonb,$14,$15,$16)
         on conflict (id) do update set
           workspace_id = excluded.workspace_id,
           name = excluded.name,
           status = excluded.status,
           knowledge_base_ids = excluded.knowledge_base_ids,
           description = excluded.description,
           welcome_message = excluded.welcome_message,
           system_prompt = excluded.system_prompt,
           recommended_questions = excluded.recommended_questions,
           collect_leads_on_failure = excluded.collect_leads_on_failure,
           rate_limit_per_minute = excluded.rate_limit_per_minute,
           allowed_domains = excluded.allowed_domains,
           lead_fields = excluded.lead_fields,
           llm_temperature = excluded.llm_temperature,
           max_output_tokens = excluded.max_output_tokens,
           updated_at = excluded.updated_at`,
        [
          bot.id,
          bot.workspaceId,
          bot.name,
          bot.status,
          toJson(bot.knowledgeBaseIds),
          bot.description,
          bot.welcomeMessage,
          bot.systemPrompt,
          toJson(bot.recommendedQuestions),
          bot.collectLeadsOnFailure,
          bot.rateLimitPerMinute,
          toJson(bot.allowedDomains),
          toJson(bot.leadFields),
          bot.llmTemperature,
          bot.maxOutputTokens,
          bot.updatedAt,
        ],
      );
    }
  });
}

export async function hydrateRepositoriesFromPostgres(input: {
  auth?: InMemoryAuthRepository;
  documents?: InMemoryDocumentRepository;
  rag?: InMemoryRagRepository;
}): Promise<boolean> {
  return withClient(async (client) => {
    const runtimeStateRows = await client.query<{ value: { seeded?: boolean } }>(
      "select value from runtime_state where key = $1",
      [SNAPSHOT_STATE_KEY],
    );
    const snapshotState = runtimeStateRows.rows[0]?.value;
    const hasSnapshot = snapshotState?.seeded === true;

    if (!hasSnapshot) {
      return false;
    }

    if (input.auth) {
      const users = (await client.query("select * from users")).rows.map(mapUser);
      const workspaces = (await client.query("select * from workspaces")).rows.map(
        mapWorkspace,
      );
      const workspaceMembers = (
        await client.query("select * from workspace_members")
      ).rows.map(mapWorkspaceMember);
      const workspaceInvitations = (
        await client.query("select * from workspace_invitations")
      ).rows.map(mapWorkspaceInvitation);
      const refreshSessions = (
        await client.query("select * from refresh_sessions")
      ).rows.map(mapRefreshSession);
      const emailLoginCodes = (
        await client.query("select * from email_login_codes")
      ).rows.map(mapEmailLoginCode);
      const trialRequests = (
        await client.query("select * from trial_requests")
      ).rows.map(mapTrialRequest);

      input.auth.loadSnapshot({
        users,
        workspaces,
        workspaceMembers,
        workspaceInvitations,
        refreshSessions,
        emailLoginCodes,
        trialRequests,
      });
    }

    if (input.documents) {
      const knowledgeBases = (await client.query("select * from knowledge_bases")).rows.map(
        mapKnowledgeBase,
      );
      const documents = (await client.query("select * from documents")).rows.map(mapDocument);
      input.documents.loadSnapshot({ knowledgeBases, documents });
    }

    if (input.rag) {
      const bots = (await client.query("select * from bots")).rows.map(mapBot);
      const chunks = (await client.query("select * from document_chunks")).rows.map(mapChunk);
      input.rag.loadSnapshot({ bots, chunks });
    }

    return true;
  });
}

async function truncateAll(client: PoolClient): Promise<void> {
  await client.query("begin");
  try {
    await client.query("select pg_advisory_xact_lock(424242)");
    await client.query("truncate table message_citations restart identity cascade").catch(() => {});
    await client.query("truncate table document_chunks restart identity cascade");
    await client.query("truncate table documents restart identity cascade");
    await client.query("truncate table knowledge_bases restart identity cascade");
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  }
}

export async function persistRepositoriesToPostgres(input: {
  auth?: InMemoryAuthRepository;
  documents?: InMemoryDocumentRepository;
  rag?: InMemoryRagRepository;
}): Promise<void> {
  const authSnapshot = input.auth?.dumpSnapshot() ?? null;
  const documentSnapshot = input.documents?.dumpSnapshot() ?? null;
  const ragSnapshot = input.rag?.dumpSnapshot() ?? null;
  const chunkIds = ragSnapshot?.chunks.map((chunk) => chunk.id) ?? [];

  await withClient(async (client) => {
    await client.query("begin");
    try {
      await client.query("select pg_advisory_xact_lock(424242)");

      if (authSnapshot) {
        for (const user of authSnapshot.users) {
          await client.query(
            `insert into users
             (id, email, password_hash, name, status, active_workspace_id, platform_role, account_profile, created_at, updated_at)
             values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
             on conflict (id) do update set
               email = excluded.email,
               password_hash = excluded.password_hash,
               name = excluded.name,
               status = excluded.status,
               active_workspace_id = excluded.active_workspace_id,
               platform_role = excluded.platform_role,
               account_profile = excluded.account_profile,
               updated_at = excluded.updated_at`,
            [
              user.id,
              user.email,
              user.passwordHash,
              user.name,
              user.status,
              user.activeWorkspaceId,
              user.platformRole,
              JSON.stringify(user.accountProfile ?? {}),
              user.createdAt,
              user.updatedAt,
            ],
          );
        }

        for (const workspace of authSnapshot.workspaces) {
          await client.query(
            `insert into workspaces
             (id, name, slug, owner_id, website, plan, contact_name, contact_email, contact_phone, provisioned_by_user_id, created_at, updated_at)
             values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
             on conflict (id) do update set
               name = excluded.name,
               slug = excluded.slug,
               owner_id = excluded.owner_id,
               website = excluded.website,
               plan = excluded.plan,
               contact_name = excluded.contact_name,
               contact_email = excluded.contact_email,
               contact_phone = excluded.contact_phone,
               provisioned_by_user_id = excluded.provisioned_by_user_id,
               updated_at = excluded.updated_at`,
            [
              workspace.id,
              workspace.name,
              workspace.slug,
              workspace.ownerId,
              workspace.website,
              workspace.plan,
              workspace.contactName,
              workspace.contactEmail,
              workspace.contactPhone,
              workspace.provisionedByUserId,
              workspace.createdAt,
              workspace.updatedAt,
            ],
          );
        }

        for (const member of authSnapshot.workspaceMembers) {
          await client.query(
            `insert into workspace_members
             (workspace_id, user_id, role, created_at)
             values ($1,$2,$3,$4)
             on conflict (workspace_id, user_id) do update set
               role = excluded.role`,
            [member.workspaceId, member.userId, member.role, member.createdAt],
          );
        }

        for (const invitation of authSnapshot.workspaceInvitations) {
          await client.query(
            `insert into workspace_invitations
             (id, workspace_id, email, role, invited_by_user_id, token, status, expires_at, accepted_at, created_at, updated_at)
             values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
             on conflict (id) do update set
               email = excluded.email,
               role = excluded.role,
               status = excluded.status,
               expires_at = excluded.expires_at,
               accepted_at = excluded.accepted_at,
               updated_at = excluded.updated_at`,
            [
              invitation.id,
              invitation.workspaceId,
              invitation.email,
              invitation.role,
              invitation.invitedByUserId,
              invitation.token,
              invitation.status,
              invitation.expiresAt,
              invitation.acceptedAt,
              invitation.createdAt,
              invitation.updatedAt,
            ],
          );
        }

        for (const session of authSnapshot.refreshSessions) {
          await client.query(
            `insert into refresh_sessions
             (id, user_id, token_hash, expires_at, revoked_at, created_at)
             values ($1,$2,$3,$4,$5,$6)
             on conflict (id) do update set
               token_hash = excluded.token_hash,
               expires_at = excluded.expires_at,
               revoked_at = excluded.revoked_at`,
            [
              session.id,
              session.userId,
              session.tokenHash,
              session.expiresAt,
              session.revokedAt,
              session.createdAt,
            ],
          );
        }

        for (const code of authSnapshot.emailLoginCodes) {
          await client.query(
            `insert into email_login_codes
             (id, email, purpose, code_hash, expires_at, consumed_at, created_at, updated_at)
             values ($1,$2,$3,$4,$5,$6,$7,$8)
             on conflict (id) do update set
               purpose = excluded.purpose,
               code_hash = excluded.code_hash,
               expires_at = excluded.expires_at,
               consumed_at = excluded.consumed_at,
               updated_at = excluded.updated_at`,
            [
              code.id,
              code.email,
              code.purpose,
              code.codeHash,
              code.expiresAt,
              code.consumedAt,
              code.createdAt,
              code.updatedAt,
            ],
          );
        }

        for (const request of authSnapshot.trialRequests) {
          await client.query(
            `insert into trial_requests
             (id, company_name, contact_name, email, phone, website, requirement, requested_plan, status,
              consent_accepted_at, consent_version, processed_by_user_id, processed_at, review_notes,
              approved_workspace_id, approved_invitation_id, created_at, updated_at)
             values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
             on conflict (id) do update set
               company_name = excluded.company_name,
               contact_name = excluded.contact_name,
               email = excluded.email,
               phone = excluded.phone,
               website = excluded.website,
               requirement = excluded.requirement,
               requested_plan = excluded.requested_plan,
               status = excluded.status,
               consent_accepted_at = excluded.consent_accepted_at,
               consent_version = excluded.consent_version,
               processed_by_user_id = excluded.processed_by_user_id,
               processed_at = excluded.processed_at,
               review_notes = excluded.review_notes,
               approved_workspace_id = excluded.approved_workspace_id,
               approved_invitation_id = excluded.approved_invitation_id,
               updated_at = excluded.updated_at`,
            [
              request.id,
              request.companyName,
              request.contactName,
              request.email,
              request.phone,
              request.website,
              request.requirement,
              request.requestedPlan,
              request.status,
              request.consentAcceptedAt,
              request.consentVersion,
              request.processedByUserId,
              request.processedAt,
              request.reviewNotes,
              request.approvedWorkspaceId,
              request.approvedInvitationId,
              request.createdAt,
              request.updatedAt,
            ],
          );
        }
      }

      if (documentSnapshot) {
        for (const kb of documentSnapshot.knowledgeBases) {
          await client.query(
            `insert into knowledge_bases
             (id, workspace_id, name, status, created_at, updated_at, deleted_at)
             values ($1,$2,$3,$4,$5,$6,$7)
             on conflict (id) do update set
               name = excluded.name,
               status = excluded.status,
               updated_at = excluded.updated_at,
               deleted_at = excluded.deleted_at`,
            [kb.id, kb.workspaceId, kb.name, kb.status, kb.createdAt, kb.updatedAt, kb.deletedAt],
          );
        }

        for (const doc of documentSnapshot.documents) {
          await client.query(
            `insert into documents
             (id, workspace_id, knowledge_base_id, file_name, file_type, storage_key, size_bytes, status, chunk_count, error_code, error_message, content_hash, created_at, updated_at, deleted_at)
             values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
             on conflict (id) do update set
               file_name = excluded.file_name,
               file_type = excluded.file_type,
               storage_key = excluded.storage_key,
               size_bytes = excluded.size_bytes,
               status = excluded.status,
               chunk_count = excluded.chunk_count,
               error_code = excluded.error_code,
               error_message = excluded.error_message,
               content_hash = excluded.content_hash,
               updated_at = excluded.updated_at,
               deleted_at = excluded.deleted_at`,
            [
              doc.id,
              doc.workspaceId,
              doc.knowledgeBaseId,
              doc.fileName,
              doc.fileType,
              doc.storageKey,
              doc.sizeBytes,
              doc.status,
              doc.chunkCount,
              doc.errorCode,
              doc.errorMessage,
              doc.contentHash,
              doc.createdAt,
              doc.updatedAt,
              doc.deletedAt,
            ],
          );
        }
      }

      if (ragSnapshot) {
        for (const bot of ragSnapshot.bots) {
          await client.query(
            `insert into bots (
               id, workspace_id, name, status, knowledge_base_ids,
               description, welcome_message, system_prompt, recommended_questions,
               collect_leads_on_failure, rate_limit_per_minute,
               allowed_domains, lead_fields, llm_temperature, max_output_tokens, updated_at
             )
             values ($1,$2,$3,$4,$5::jsonb,$6,$7,$8,$9::jsonb,$10,$11,$12::jsonb,$13::jsonb,$14,$15,$16)
             on conflict (id) do update set
               workspace_id = excluded.workspace_id,
               name = excluded.name,
               status = excluded.status,
               knowledge_base_ids = excluded.knowledge_base_ids,
               description = excluded.description,
               welcome_message = excluded.welcome_message,
               system_prompt = excluded.system_prompt,
               recommended_questions = excluded.recommended_questions,
               collect_leads_on_failure = excluded.collect_leads_on_failure,
               rate_limit_per_minute = excluded.rate_limit_per_minute,
               allowed_domains = excluded.allowed_domains,
               lead_fields = excluded.lead_fields,
               llm_temperature = excluded.llm_temperature,
               max_output_tokens = excluded.max_output_tokens,
               updated_at = excluded.updated_at`,
            [
              bot.id,
              bot.workspaceId,
              bot.name,
              bot.status,
              toJson(bot.knowledgeBaseIds),
              bot.description,
              bot.welcomeMessage,
              bot.systemPrompt,
              toJson(bot.recommendedQuestions),
              bot.collectLeadsOnFailure,
              bot.rateLimitPerMinute,
              toJson(bot.allowedDomains),
              toJson(bot.leadFields),
              bot.llmTemperature,
              bot.maxOutputTokens,
              bot.updatedAt,
            ],
          );
        }

        for (const chunk of ragSnapshot.chunks) {
          await client.query(
            `insert into document_chunks
             (id, workspace_id, knowledge_base_id, document_id, document_title, content, section_title, chunk_index, embedding)
             values ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)
             on conflict (id) do update set
               workspace_id = excluded.workspace_id,
               knowledge_base_id = excluded.knowledge_base_id,
               document_id = excluded.document_id,
               document_title = excluded.document_title,
               content = excluded.content,
               section_title = excluded.section_title,
               chunk_index = excluded.chunk_index,
               embedding = excluded.embedding`,
            [
              chunk.id,
              chunk.workspaceId,
              chunk.knowledgeBaseId,
              chunk.documentId,
              chunk.documentTitle,
              chunk.content,
              chunk.sectionTitle,
              chunk.chunkIndex,
              toJson(chunk.embedding),
            ],
          );
        }

        if (chunkIds.length > 0) {
          await client.query(
            `delete from document_chunks
             where id <> all($1::text[])`,
            [chunkIds],
          );
        }
      }

      await client.query(
        `insert into runtime_state (key, value, updated_at)
         values ($1, $2::jsonb, now())
         on conflict (key) do update
         set value = excluded.value,
             updated_at = excluded.updated_at`,
        [SNAPSHOT_STATE_KEY, toJson({ seeded: true })],
      );

      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
  });
}

export async function resetDocumentTablesForTests(): Promise<void> {
  await withClient(async (client) => {
    await truncateAll(client);
  });
}
