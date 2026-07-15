#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

if [[ ! -f .env ]]; then
  echo "缺少 .env，请先执行: cp infra/.env.ecs.example .env && nano .env"
  exit 1
fi

echo "==> 拉取最新代码（如在 git 仓库内）"
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  git pull --ff-only || true
fi

echo "==> 运行 migration"
docker compose -f infra/docker-compose.ecs.yml --profile ops run --rm migrate

echo "==> 构建并启动服务"
docker compose -f infra/docker-compose.ecs.yml up -d --build

echo "==> 服务状态"
docker compose -f infra/docker-compose.ecs.yml ps

echo "==> 本机探活"
curl -fsS http://127.0.0.1:3001/health && echo
echo ""
echo "备份数据库: ./infra/ecs/backup.sh"
echo "部署完成。公网: http://<公网IP>/health"
echo "本地 Console .env.local: API_BASE_URL=http://<公网IP>"
