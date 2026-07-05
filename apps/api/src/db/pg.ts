/* eslint-disable @typescript-eslint/no-require-imports */
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

export async function query<T extends QueryResultRow>(
  text: string,
  values: unknown[] = [],
): Promise<T[]> {
  const result = await getPool().query<T>(text, values);
  return result.rows;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
