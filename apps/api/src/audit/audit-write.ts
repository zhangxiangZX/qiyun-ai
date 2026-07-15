import type { RequestContext } from "../workspace";
import type { AuditApi } from "./audit.api";
import type { WriteAuditInput } from "./audit.repository";

export function writeWorkspaceAudit(
  auditApi: AuditApi | undefined,
  context: Pick<RequestContext, "workspaceId" | "userId">,
  input: Omit<WriteAuditInput, "workspaceId" | "userId">,
): void {
  if (!auditApi) return;
  void auditApi.write({
    workspaceId: context.workspaceId,
    userId: context.userId,
    module: input.module,
    action: input.action,
    targetId: input.targetId ?? null,
    ip: input.ip ?? null,
    detail: input.detail ?? null,
  });
}
