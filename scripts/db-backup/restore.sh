#!/usr/bin/env bash
#
# restore.sh —— qiyun-ai 数据库恢复脚本
#
# 功能：
#   从指定的 SQL 备份文件恢复数据库（psql < file）。
#   备份文件通常由 backup.sh 生成（含 --clean --if-exists，会先清理再重建对象）。
#
# ⚠️ 警告：恢复会覆盖/替换目标数据库中的现有数据，操作不可逆！
#   执行前请务必先对当前数据库做一份新备份。
#
# 用法：
#   bash scripts/db-backup/restore.sh <path/to/backup.sql>
#   ENV_FILE=/path/to/.env bash scripts/db-backup/restore.sh backups/qiyun_ai_2026-07-07_03-30.sql
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# 与 backup.sh 相同的解析逻辑 -------------------------------------------------
load_db_env() {
  local env_file="$1"
  if [ ! -f "$env_file" ]; then
    echo "错误：未找到 .env 文件: $env_file" >&2
    return 2
  fi
  local out
  if ! out=$(ENV_FILE="$env_file" node <<'NODE'
    const fs = require('fs');
    const envFile = process.env.ENV_FILE;
    const txt = fs.readFileSync(envFile, 'utf8');
    const m = txt.match(/^[ \t]*DATABASE_URL[ \t]*=[ \t]*(.*?)[ \t]*$/m);
    if (!m) { process.stderr.write('在 ' + envFile + ' 中未找到 DATABASE_URL\n'); process.exit(3); }
    let raw = m[1];
    if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) raw = raw.slice(1, -1);
    let url;
    try { url = new URL(raw); } catch (e) { process.stderr.write('DATABASE_URL 不是合法的 URL: ' + e.message + '\n'); process.exit(4); }
    const pw = decodeURIComponent(url.password);
    process.stdout.write('PGUSER=' + url.username + '\n');
    process.stdout.write('PGHOST=' + url.hostname + '\n');
    process.stdout.write('PGPORT=' + (url.port || '5432') + '\n');
    process.stdout.write('PGDATABASE=' + url.pathname.replace(/^\//, '') + '\n');
    process.stdout.write('PGPASSWORD=' + pw + '\n');
NODE
  ); then
    echo "错误：解析 DATABASE_URL 失败，请检查 .env 文件内容。" >&2
    return 1
  fi
  while IFS= read -r line; do
    [ -n "$line" ] && export "$line"
  done <<< "$out"
}

resolve_env_file() {
  if [ -n "${ENV_FILE:-}" ]; then echo "$ENV_FILE"; return 0; fi
  local candidates=("$REPO_ROOT/apps/api/.env" "$REPO_ROOT/.env")
  for c in "${candidates[@]}"; do
    if [ -f "$c" ]; then echo "$c"; return 0; fi
  done
  echo ""
}

usage() {
  echo "用法: $0 <备份sql文件路径>" >&2
  echo "示例: $0 backups/qiyun_ai_2026-07-07_03-30.sql" >&2
}

main() {
  if [ "$#" -ne 1 ]; then
    usage
    exit 2
  fi
  local sql_file="$1"
  if [ ! -f "$sql_file" ]; then
    echo "错误：备份文件不存在: $sql_file" >&2
    exit 2
  fi

  local env_file
  env_file="$(resolve_env_file)"
  if [ -z "$env_file" ]; then
    echo "错误：未找到 .env 文件（已尝试 \$ENV_FILE / apps/api/.env / 根目录 .env）。" >&2
    exit 2
  fi

  if ! command -v psql >/dev/null 2>&1; then
    echo "错误：未找到 psql，请安装 PostgreSQL 客户端并加入 PATH 后重试。" >&2
    exit 1
  fi

  load_db_env "$env_file"

  echo "==================================================================="
  echo " ⚠️  危险操作：即将恢复数据库 '$PGDATABASE' @ $PGHOST:$PGPORT"
  echo "     恢复会覆盖/替换现有数据，且不可逆！"
  echo "     建议先执行 backup.sh 对当前库做一份新备份。"
  echo "     源文件: $sql_file"
  echo "==================================================================="
  printf "请输入 YES 以确认继续（其他任意输入将取消）: "
  local confirm
  read -r confirm
  if [ "${confirm:-}" != "YES" ]; then
    echo "已取消恢复操作。"
    exit 0
  fi

  echo "[$(date '+%Y-%m-%d %H:%M:%S')] 开始恢复: $sql_file"
  # 使用 --single-transaction 让恢复在一个事务内完成，失败可整体回滚（适用于 --clean 的数据 dump）
  psql --no-password --single-transaction -f "$sql_file"
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] 恢复完成。"
}

main "$@"
