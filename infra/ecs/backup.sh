#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-$ROOT_DIR/backups}"
STAMP="$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

COMPOSE_FILE="${COMPOSE_FILE:-$ROOT_DIR/infra/docker-compose.ecs.yml}"
ENV_FILE="${ENV_FILE:-$ROOT_DIR/.env}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing env file: $ENV_FILE (copy infra/.env.ecs.example to .env)" >&2
  exit 1
fi

DB_NAME="${POSTGRES_DB:-qiyun_ai}"
DB_USER="${POSTGRES_USER:-postgres}"

DUMP_PATH="$BACKUP_DIR/qiyun-db-$STAMP.sql.gz"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T postgres \
  pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$DUMP_PATH"

echo "Database backup written to $DUMP_PATH"
