/* eslint-disable @typescript-eslint/no-require-imports */
import { getTenantContext, isTenantBypass } from "./tenant-context";

type QueryResultRow = Record<string, unknown>;

interface QueryResult<T extends QueryResultRow> {
  rows: T[];
}

export interface PoolClient {
  query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: unknown[],
  ): Promise<QueryResult<T>>;
  release(): void;
}

interface PoolConstructor {
  new (input: { connectionString?: string }): PoolLike;
}

interface PoolLike {
  connect(): Promise<PoolClient>;
  query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: unknown[],
  ): Promise<QueryResult<T>>;
  end(): Promise<void>;
}

let pool: PoolLike | null = null;
let PoolCtor: PoolConstructor | null = null;

function getPoolCtor(): PoolConstructor {
  if (!PoolCtor) {
    const pgModule = require("pg") as { Pool: PoolConstructor };
    PoolCtor = pgModule.Pool;
  }

  return PoolCtor;
}

export function getPool(): PoolLike {
  if (!pool) {
    const Pool = getPoolCtor();
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
  }

  return pool;
}

export async function withClient<T>(
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await getPool().connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}

export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  return withClient(async (client) => {
    await client.query("begin");
    await applyTenantScope(client);
    try {
      const result = await fn(client);
      await client.query("commit");
      return result;
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
  });
}

/**
 * 为查询注入当前租户上下文（模块 18）。
 * - 旁路哨兵 → SET LOCAL app.bypass_rls='true'（listAllChunks 等显式跨租户内部操作）
 * - 普通 workspaceId → SET LOCAL app.workspace_id=$1（配合 migration/029 的 RLS 策略）
 * - 均未设置 → 不设（RLS 未启用或系统路径；RLS 默认门控关闭）
 * SET LOCAL 事务作用域，提交/回滚后自动复位，避免连接池复用导致的跨请求串味。
 */
async function applyTenantScope(client: PoolClient): Promise<void> {
  if (isTenantBypass()) {
    await client.query("SET LOCAL app.bypass_rls = 'true'");
    return;
  }
  const workspaceId = getTenantContext();
  if (workspaceId) {
    // node-postgres 对 SET 类语句走 simple query protocol，不支持 $N 占位符，
    // 会把 $1 原样发给 Postgres 导致 `syntax error at or near "$1"`。
    // 此处内联字面量；workspaceId 来自受控租户上下文，转义单引号以防注入。
    const escaped = String(workspaceId).replace(/'/g, "''");
    await client.query(`SET LOCAL app.workspace_id = '${escaped}'`);
  }
}

export async function query<T extends QueryResultRow>(
  text: string,
  values: unknown[] = [],
): Promise<T[]> {
  return withClient(async (client) => {
    await client.query("begin");
    try {
      await applyTenantScope(client);
      const result = await client.query<T>(text, values);
      await client.query("commit");
      return result.rows;
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
  });
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
