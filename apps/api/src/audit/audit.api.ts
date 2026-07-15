import type { RequestContext } from "../workspace";
import type { AuditService } from "./audit.service";
import { enrichAuditEntry } from "./audit-labels";
import type { ListAuditQuery, WriteAuditInput } from "./audit.repository";

export class AuditApi {
  constructor(private readonly service: AuditService) {}

  async list(context: RequestContext, query: ListAuditQuery) {
    const entries = await this.service.list(context.workspaceId, query);
    return entries.map(enrichAuditEntry);
  }

  write(input: WriteAuditInput) {
    return this.service.write(input);
  }
}
