import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { loadApiEnv } from "../config/env";
import { withClient } from "./pg";

const MIGRATION_TABLE_SQL = `
  create table if not exists schema_migrations (
    filename text primary key,
    applied_at timestamptz not null default now()
  )
`;
const MIGRATION_LOCK_SQL = "hashtext('qiyun_schema_migrations')";

function getMigrationDir(): string {
  const candidates = [
    path.resolve(__dirname, "../../../../migration"),
    path.resolve(__dirname, "../../../../../migration"),
    path.resolve(process.cwd(), "migration"),
    path.resolve(process.cwd(), "../../migration"),
  ];

  const resolved = candidates.find((candidate) => existsSync(candidate));
  if (!resolved) {
    throw new Error(`Migration directory not found. Checked: ${candidates.join(", ")}`);
  }
  return resolved;
}

async function listMigrationFiles(): Promise<string[]> {
  return (await readdir(getMigrationDir()))
    .filter((file) => file.endsWith(".sql"))
    .sort();
}

export async function ensureMigrationsApplied(): Promise<number> {
  const files = await listMigrationFiles();

  return withClient(async (client) => {
    await client.query(`select pg_advisory_lock(${MIGRATION_LOCK_SQL})`);

    try {
      await client.query(MIGRATION_TABLE_SQL);
      const appliedRows = await client.query<{ filename: string }>(
        "select filename from schema_migrations",
      );
      const applied = new Set(appliedRows.rows.map((row) => row.filename));
      let executedCount = 0;

      for (const file of files) {
        if (applied.has(file)) continue;

        const sql = await readFile(path.join(getMigrationDir(), file), "utf8");
        await client.query("begin");
        await client.query("SET LOCAL app.bypass_rls = 'true'");

        try {
          await client.query(sql);
          await client.query("insert into schema_migrations (filename) values ($1)", [file]);
          await client.query("commit");
          executedCount += 1;
        } catch (error) {
          await client.query("rollback");
          throw error;
        }
      }

      return executedCount;
    } finally {
      await client.query(`select pg_advisory_unlock(${MIGRATION_LOCK_SQL})`);
    }
  });
}

async function main(): Promise<void> {
  loadApiEnv();
  const applied = await ensureMigrationsApplied();
  process.stdout.write(`Applied ${applied} migration(s).\n`);
}

if (require.main === module) {
  void main().catch((error) => {
    process.stderr.write(`${String(error)}\n`);
    process.exitCode = 1;
  });
}
