import type { AuditRepository, ListAuditQuery, WriteAuditInput } from "./audit.repository";

/**
 * 审计服务。采用 best-effort 写入：审计失败不应阻断主业务操作，
 * 但会在服务端记录错误日志以便排查。
 */
export class AuditService {
  constructor(private readonly repository: AuditRepository) {}

  async write(input: WriteAuditInput): Promise<void> {
    try {
      await this.repository.write(input);
    } catch (error) {
      console.error("[audit] write failed", error);
    }
  }

  list(workspaceId: string, query: ListAuditQuery) {
    return this.repository.list(workspaceId, query);
  }
}
