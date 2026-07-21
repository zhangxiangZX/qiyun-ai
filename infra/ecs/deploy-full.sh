#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

ENV_FILE=".env.production"
PUBLIC_IP="${QIYUN_PUBLIC_IP:-101.201.63.118}"
CONSOLE_URL="${QIYUN_CONSOLE_URL:-http://console.qiyuntu.cn}"
API_URL="${QIYUN_API_URL:-http://api.qiyuntu.cn}"
WIDGET_URL="${QIYUN_WIDGET_URL:-http://cdn.qiyuntu.cn}"
SITE_URL="${QIYUN_SITE_URL:-http://www.qiyuntu.cn}"
ENTRY_URL="${QIYUN_ENTRY_URL:-http://go.qiyuntu.cn}"

if [[ ! -f "$ENV_FILE" ]]; then
  cp .env.production.http.example "$ENV_FILE"
  echo "Created $ENV_FILE from the HTTP production template."
  echo "Fill its credentials, then run this script again."
  exit 1
fi

bash scripts/production-preflight.sh "$ENV_FILE"

if ! command -v docker >/dev/null 2>&1; then
  echo "==> Installing Docker and Nginx"
  curl -fsSL https://get.docker.com | sh
  apt-get update
  apt-get install -y docker-compose-plugin nginx
fi

echo "==> Updating source"
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  git pull --ff-only
fi

echo "==> Building current API, Worker, and Console images"
docker compose --env-file "$ENV_FILE" -f infra/docker-compose.ecs.yml build api worker console

echo "==> Stopping application containers before schema migration"
docker compose --env-file "$ENV_FILE" -f infra/docker-compose.ecs.yml stop api worker console || true

echo "==> Running database migrations with the newly built image"
docker compose --env-file "$ENV_FILE" -f infra/docker-compose.ecs.yml --profile ops run --rm migrate

echo "==> Starting the production stack"
docker compose --env-file "$ENV_FILE" -f infra/docker-compose.ecs.yml up -d

echo "==> Installing five-domain Nginx configuration"
cp infra/nginx/qiyun-api.conf /etc/nginx/sites-available/qiyun-api
cp infra/nginx/qiyun-console.conf /etc/nginx/sites-available/qiyun-console
cp infra/nginx/qiyun-public.conf /etc/nginx/sites-available/qiyun-public
cp infra/nginx/qiyun-ip-test.conf /etc/nginx/sites-available/qiyun-ip-test
ln -sf /etc/nginx/sites-available/qiyun-api /etc/nginx/sites-enabled/qiyun-api
ln -sf /etc/nginx/sites-available/qiyun-console /etc/nginx/sites-enabled/qiyun-console
ln -sf /etc/nginx/sites-available/qiyun-public /etc/nginx/sites-enabled/qiyun-public
ln -sf /etc/nginx/sites-available/qiyun-ip-test /etc/nginx/sites-enabled/qiyun-ip-test
rm -f /etc/nginx/sites-enabled/default /etc/nginx/sites-enabled/qiyun-unified
nginx -t
systemctl reload nginx

echo "==> Service status"
docker compose --env-file "$ENV_FILE" -f infra/docker-compose.ecs.yml ps

echo "==> Local health probes"
wait_for_http() {
  local label="$1"
  local url="$2"
  local attempts="${3:-30}"
  local delay="${4:-2}"

  for ((attempt = 1; attempt <= attempts; attempt++)); do
    if curl -fsS -o /dev/null "$url"; then
      echo "$label is ready ($url)"
      return 0
    fi

    if ((attempt < attempts)); then
      echo "Waiting for $label ($attempt/$attempts)..."
      sleep "$delay"
    fi
  done

  echo "$label did not become ready after $((attempts * delay)) seconds: $url" >&2
  return 1
}

wait_for_http "API" "http://127.0.0.1:3001/health"
wait_for_http "Console" "http://127.0.0.1:3000/login"

echo
echo "Deployment complete for ${PUBLIC_IP}"
echo "  Website: $SITE_URL"
echo "  Console: $CONSOLE_URL/login"
echo "  API:     $API_URL/health"
echo "  Entry:   $ENTRY_URL"
echo "  Widget:  $WIDGET_URL/public/widget.js"
