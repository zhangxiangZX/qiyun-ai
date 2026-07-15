#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

PUBLIC_IP="${QIYUN_PUBLIC_IP:-101.201.63.118}"
CONSOLE_URL="${QIYUN_CONSOLE_URL:-https://console.qiyuntu.cn}"
API_URL="${QIYUN_API_URL:-https://api.qiyuntu.cn}"
WIDGET_URL="${QIYUN_WIDGET_URL:-https://cdn.qiyuntu.cn}"
SITE_URL="${QIYUN_SITE_URL:-https://www.qiyuntu.cn}"
ENTRY_URL="${QIYUN_ENTRY_URL:-https://go.qiyuntu.cn}"
CORS_ORIGIN="${QIYUN_CORS_ORIGIN:-${SITE_URL},${CONSOLE_URL},${ENTRY_URL}}"

ensure_env() {
  if [[ -f .env ]]; then
    return
  fi

  echo "==> 首次部署：从模板创建 .env"
  cp infra/.env.ecs.example .env

  JWT_SECRET="$(openssl rand -hex 32)"
  JWT_REFRESH="$(openssl rand -hex 32)"
  DB_PASS="$(openssl rand -hex 16)"
  MINIO_PASS="$(openssl rand -hex 16)"

  sed -i "s|CHANGE_ME_JWT_SECRET|${JWT_SECRET}|g" .env
  sed -i "s|CHANGE_ME_JWT_REFRESH_SECRET|${JWT_REFRESH}|g" .env
  sed -i "s|CHANGE_DB_PASSWORD|${DB_PASS}|g" .env
  sed -i "s|CHANGE_MINIO_PASSWORD|${MINIO_PASS}|g" .env
  sed -i "s|^APP_URL=.*|APP_URL=${CONSOLE_URL}|" .env
  sed -i "s|^CORS_ORIGIN=.*|CORS_ORIGIN=${CORS_ORIGIN}|" .env
  sed -i "s|^NEXT_PUBLIC_WIDGET_URL=.*|NEXT_PUBLIC_WIDGET_URL=${WIDGET_URL}|" .env
  if grep -q '^PUBLIC_API_URL=' .env; then
    sed -i "s|^PUBLIC_API_URL=.*|PUBLIC_API_URL=${API_URL}|" .env
  else
    echo "PUBLIC_API_URL=${API_URL}" >> .env
  fi
  if grep -q '^PUBLIC_SITE_URL=' .env; then
    sed -i "s|^PUBLIC_SITE_URL=.*|PUBLIC_SITE_URL=${SITE_URL}|" .env
  else
    echo "PUBLIC_SITE_URL=${SITE_URL}" >> .env
  fi
  if grep -q '^PUBLIC_ENTRY_URL=' .env; then
    sed -i "s|^PUBLIC_ENTRY_URL=.*|PUBLIC_ENTRY_URL=${ENTRY_URL}|" .env
  else
    echo "PUBLIC_ENTRY_URL=${ENTRY_URL}" >> .env
  fi

  echo ""
  echo "!! 请编辑 .env 填入 LLM_API_KEY、LLM_EMBEDDING_API_KEY、RESEND_API_KEY 后重新运行本脚本"
  echo "   nano .env"
  exit 1
}

ensure_env

if grep -q 'replace-me' .env || grep -q 'CHANGE_' .env; then
  echo "!! .env 仍有占位符（LLM_API_KEY / RESEND 等），请先 nano .env 再部署"
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "==> 安装 Docker"
  curl -fsSL https://get.docker.com | sh
  apt-get install -y docker-compose-plugin nginx
fi

echo "==> 拉取最新代码"
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  git pull --ff-only || true
fi

echo "==> 运行 migration"
docker compose -f infra/docker-compose.ecs.yml --profile ops run --rm migrate

echo "==> 构建并启动 API / Worker / Console"
docker compose -f infra/docker-compose.ecs.yml up -d --build

echo "==> 配置 Nginx"
if command -v nginx >/dev/null 2>&1; then
  cp infra/nginx/qiyun-api.conf /etc/nginx/sites-available/qiyun-api
  cp infra/nginx/qiyun-console.conf /etc/nginx/sites-available/qiyun-console
  ln -sf /etc/nginx/sites-available/qiyun-api /etc/nginx/sites-enabled/qiyun-api
  ln -sf /etc/nginx/sites-available/qiyun-console /etc/nginx/sites-enabled/qiyun-console
  rm -f /etc/nginx/sites-enabled/default
  nginx -t
  systemctl reload nginx
else
  echo "!! 未安装 nginx，请手动: apt install -y nginx"
fi

echo "==> 服务状态"
docker compose -f infra/docker-compose.ecs.yml ps

echo "==> 探活"
curl -fsS "http://127.0.0.1:3001/health" && echo
curl -fsS -o /dev/null -w "Console HTTP %{http_code}\n" "http://127.0.0.1:3000/login" || true

echo ""
echo "部署完成"
echo "  API:     ${API_URL}/health"
echo "  Console: ${CONSOLE_URL}/login"
echo "  试用:    ${CONSOLE_URL}/trial"
echo "  Widget:  ${API_URL}/public/widget.js"
