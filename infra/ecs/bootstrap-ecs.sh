#!/usr/bin/env bash
# 首次在空白 Ubuntu ECS 上运行（需 root）
set -euo pipefail

PUBLIC_IP="${QIYUN_PUBLIC_IP:-101.201.63.118}"
REPO_URL="${QIYUN_REPO_URL:-https://github.com/zhangxiangZX/qiyun-ai.git}"
INSTALL_DIR="${QIYUN_INSTALL_DIR:-/opt/qiyun-ai}"

echo "==> 安装基础软件"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y git curl nginx ca-certificates

if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi

apt-get install -y docker-compose-plugin

echo "==> 克隆代码"
mkdir -p "$(dirname "$INSTALL_DIR")"
if [[ ! -d "$INSTALL_DIR/.git" ]]; then
  git clone "$REPO_URL" "$INSTALL_DIR"
fi

cd "$INSTALL_DIR"
chmod +x infra/ecs/deploy-full.sh infra/ecs/bootstrap-ecs.sh

export QIYUN_PUBLIC_IP="$PUBLIC_IP"
./infra/ecs/deploy-full.sh
