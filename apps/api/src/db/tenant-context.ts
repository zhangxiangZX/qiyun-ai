import { AsyncLocalStorage } from "node:async_hooks";

/**
 * 当前请求的租户上下文（workspaceId）。
 *
 * 通过 AsyncLocalStorage 与请求异步链绑定：在 authContext.resolve 中经
 * enterWithTenant 注入后，该请求后续所有 DB 查询（含 handler 内的 continuation）
 * 都能读到正确的 workspaceId，无需在每层函数签名里透传。
 *
 * 模块 18（租户隔离）用途：db/pg.ts 据此为每条查询注入
 * `SET LOCAL app.workspace_id`，配合 migration/029 的 RLS 策略实现数据库层
 * 行级安全——即使应用层漏写 WHERE workspace_id 也不会越权。
 */

const tenantStorage = new AsyncLocalStorage<string>();

/** 旁路哨兵：仅 listAllChunks / syncStoredChunks 等显式跨租户内部操作用 runWithBypassRls 设置。 */
export const TENANT_BYPASS_SENTINEL = "__bypass_rls__";

export function getTenantContext(): string | null {
  return tenantStorage.getStore() ?? null;
}

export function isTenantBypass(): boolean {
  return getTenantContext() === TENANT_BYPASS_SENTINEL;
}

/**
 * 为当前异步上下文及其后续 continuation 设置租户上下文。
 * 用 enterWith 而非 run，是为了让调用方（路由 handler）的后续 DB 调用也能读到。
 */
export function enterWithTenant(workspaceId: string): void {
  tenantStorage.enterWith(workspaceId);
}

/** 在受控旁路内执行跨租户操作（如加载全部租户 chunk 供共享兜底向量库）。 */
export async function runWithBypassRls<T>(fn: () => Promise<T>): Promise<T> {
  return tenantStorage.run(TENANT_BYPASS_SENTINEL, fn);
}

/**
 * 在受控租户上下文内执行一段逻辑，完成后恢复外层上下文。
 * 适合 worker/后台任务：单任务执行期间注入 workspaceId 供 RLS 使用，
 * 任务结束后自动复位，避免跨任务串味。
 */
export async function runWithTenant<T>(
  workspaceId: string,
  fn: () => Promise<T>,
): Promise<T> {
  return tenantStorage.run(workspaceId, fn);
}
