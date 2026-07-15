#!/usr/bin/env bash
#
# backup.sh —— qiyun-ai 数据库全量备份脚本
#
# 功能：
#   1. 从 .env 解析 DATABASE_URL（用 node 解析，密码含 @ / : / % 等特殊字符也安全）
#   2. 用 pg_dump 导出整库到 backups/qiyun_ai_YYYY-MM-DD_HH-MM.sql
#   3. 仅保留最近 14 份，超出删除最旧
#   4. 备份文件权限设为 600（含敏感数据）
#
# 用法：
#   bash scripts/db-backup/backup.sh
#   ENV_FILE=/path/to/.env bash scripts/db-backup/backup.sh
#
set -euo pipefail

# ----------------------------------------------------------------------------
# 路径常量（不硬编码任何用户名绝对路径）
# ----------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKUP_DIR="$SCRIPT_DIR/backups"
KEEP=14

# ----------------------------------------------------------------------------
# 公共函数：解析 DATABASE_URL 并设置 PG* 环境变量
# 使用 node 读取 .env，通过 new URL() 解析，对密码做 decodeURIComponent，
# 再以 PGPASSWORD / PGUSER / PGHOST / PGPORT / PGDATABASE 导出给 psql/pg_dump 使用。
# 这样密码里的特殊字符不会因为出现在 URL 里而出错。
# ----------------------------------------------------------------------------
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

# 按优先级解析 .env 路径：ENV_FILE 环境变量 -> apps/api/.env -> 根目录 .env
resolve_env_file() {
  if [ -n "${ENV_FILE:-}" ]; then
    echo "$ENV_FILE"
    return 0
  fi
  local candidates=("$REPO_ROOT/apps/api/.env" "$REPO_ROOT/.env")
  for c in "${candidates[@]}"; do
    if [ -f "$c" ]; then
      echo "$c"
      return 0
    fi
  done
  echo ""
}

# ----------------------------------------------------------------------------
# 主流程
# ----------------------------------------------------------------------------
main() {
  local env_file
  env_file="$(resolve_env_file)"
  if [ -z "$env_file" ]; then
    echo "错误：未找到 .env 文件。已尝试：" >&2
    echo "  - \$ENV_FILE" >&2
    echo "  - $REPO_ROOT/apps/api/.env" >&2
    echo "  - $REPO_ROOT/.env" >&2
    echo "请确认 .env 已配置 DATABASE_URL，或通过 ENV_FILE 指定路径。" >&2
    exit 2
  fi

  if ! command -v pg_dump >/dev/null 2>&1; then
    echo "错误：未找到 pg_dump，请安装 PostgreSQL 客户端并加入 PATH 后重试。" >&2
    exit 1
  fi

  load_db_env "$env_file"

  mkdir -p "$BACKUP_DIR"
  local timestamp
  timestamp="$(date +%Y-%m-%d_%H-%M)"
  local out_file="$BACKUP_DIR/qiyun_ai_${timestamp}.sql"

  echo "[$(date '+%Y-%m-%d %H:%M:%S')] 开始备份数据库 '$PGDATABASE' @ $PGHOST:$PGPORT -> $out_file"
  pg_dump --no-password --format=plain --clean --if-exists --file="$out_file"
  chmod 600 "$out_file"
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] 备份完成: $out_file ($(du -h "$out_file" | cut -f1))"

  # 仅保留最近 KEEP 份，超出删除最旧（文件名含时间戳，字典序即时间序）
  local -a all=()
  while IFS= read -r f; do
    [ -n "$f" ] && all+=("$f")
  done < <(ls -1 "$BACKUP_DIR"/qiyun_ai_*.sql 2>/dev/null | sort -r || true)

  local count=${#all[@]}
  if [ "$count" -gt "$KEEP" ]; then
    echo "备份数量 $count 超过保留上限 $KEEP，清理最旧的部分："
    for f in "${all[@]:$KEEP}"; do
      rm -f "$f"
      echo "  已删除: $f"
    done
  else
    echo "当前保留备份 $count 份（上限 $KEEP）。"
  fi

  echo "[$(date '+%Y-%m-%d %H:%M:%S')] 完成。"
}

main "$@"
