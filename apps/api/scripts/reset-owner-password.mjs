import { scryptSync, randomBytes } from "node:crypto";
import pg from "pg";

const email = process.argv[2] ?? "owner@qiyun.ai";
const password = process.argv[3] ?? "Qiyun@2026";
const databaseUrl =
  process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/qiyun_ai";

function hashPassword(value) {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(value, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

const client = new pg.Client({ connectionString: databaseUrl });
await client.connect();
const passwordHash = hashPassword(password);
const result = await client.query(
  "UPDATE users SET password_hash = $1, updated_at = NOW() WHERE email = $2 RETURNING email",
  [passwordHash, email.toLowerCase()],
);
console.log(JSON.stringify({ updated: result.rowCount, rows: result.rows }, null, 2));
await client.end();
