#!/usr/bin/env sh
set -eu

COMPOSE_FILE="${COMPOSE_FILE:-infra/docker-compose.ecs.yml}"
ENV_FILE="${ENV_FILE:-.env.production}"
CONFIRM_PHRASE="RESET_QIYUN_PRODUCTION_DATA"
MODE="${1:-dry-run}"

if [ ! -f "$COMPOSE_FILE" ]; then
  echo "Compose file not found: $COMPOSE_FILE" >&2
  exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
  echo "Production env file not found: $ENV_FILE" >&2
  exit 1
fi

if ! grep -Eq '^API_RUNTIME_DRIVER=postgres$' "$ENV_FILE"; then
  echo "Refusing reset: API_RUNTIME_DRIVER must be postgres." >&2
  exit 1
fi

if ! grep -Eq '^API_SEED_PREVIEW=false$' "$ENV_FILE"; then
  echo "Refusing reset: API_SEED_PREVIEW must be false." >&2
  exit 1
fi

cat <<'EOF'
This operation is intended only for the final pre-launch reset.
It removes PostgreSQL, Redis, MinIO, Qdrant, and local document volumes.
All tenant, customer, knowledge-base, inquiry, quote, and audit data is deleted.
EOF

if [ "$MODE" != "--execute" ]; then
  echo "Dry run only. To execute, set CONFIRM_RESET=$CONFIRM_PHRASE and pass --execute."
  exit 0
fi

if [ "${CONFIRM_RESET:-}" != "$CONFIRM_PHRASE" ]; then
  echo "Refusing reset: CONFIRM_RESET must equal $CONFIRM_PHRASE." >&2
  exit 1
fi

timestamp="$(date +%Y%m%d-%H%M%S)"
backup_dir="${BACKUP_DIR:-backups/prelaunch-$timestamp}"
mkdir -p "$backup_dir"

echo "Creating PostgreSQL backup at $backup_dir/postgres.sql"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d postgres
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T postgres \
  pg_dump -U postgres -d qiyun_ai --clean --if-exists > "$backup_dir/postgres.sql"

echo "Stopping application and deleting application data volumes"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" down --volumes --remove-orphans

echo "Recreating dependencies and applying migrations"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d postgres redis minio qdrant
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" --profile ops run --rm migrate
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --build

echo "Fresh production data stores are ready. Backup: $backup_dir/postgres.sql"
