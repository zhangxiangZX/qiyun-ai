#!/usr/bin/env bash
#
# export.sh —— 导出数据表为 CSV（供运营导出）
#
# 功能：
#   用 psql \copy 将指定表导出为 CSV（含表头）。
#   - 传入一个表名参数：仅导出该表
#   - 不传参数：导出默认核心表 leads / conversations / inquiries / quotes
#
# 用法：
#   bash scripts/db-backup/export.sh                 # 导出全部默认核心表
#   bash scripts/db-backup/export.sh leads           # 仅导出 leads
#   ENV_FILE=/path/to/.env bash scripts/db-backup/export.sh quotes
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
EXPORT_DIR="$SCRIPT_DIR/exports"

# 默认核心表（可按需增删）
DEFAULT_TABLES=(leads conversations inquiries quotes)

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

# 导出单表为 CSV
export_table() {
  local table="$1"
  local date_str
  date_str="$(date +%Y-%m-%d)"
  local out_file="$EXPORT_DIR/${table}_${date_str}.csv"

  echo "[$(date '+%Y-%m-%d %H:%M:%S')] 导出表 '$table' -> $out_file"
  # 使用服务端 COPY 的 \copy（在 psql 客户端侧写文件），表名加双引号以支持大小写/关键字
  if ! psql --no-password -c "\copy \"$table\" TO STDOUT WITH (FORMAT csv, HEADER true)" > "$out_file"; then
    echo "错误：导出表 '$table' 失败（表可能不存在或无权限）。" >&2
    rm -f "$out_file"
    return 1
  fi
  chmod 600 "$out_file"
  local rows
  rows="$(wc -l < "$out_file" || echo 0)"
  echo "  完成：共 $rows 行（含表头） -> $out_file"
}

main() {
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
  mkdir -p "$EXPORT_DIR"

  local tables=()
  if [ "$#" -ge 1 ]; then
    tables=("$@")
  else
    tables=("${DEFAULT_TABLES[@]}")
    echo "未指定表名，将导出默认核心表: ${DEFAULT_TABLES[*]}"
  fi

  local failed=0
  for t in "${tables[@]}"; do
    if ! export_table "$t"; then
      failed=1
    fi
  done

  if [ "$failed" -ne 0 ]; then
    echo "部分表导出失败，请检查上面的错误信息。" >&2
    exit 1
  fi
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] 导出任务结束。"
}

main "$@"
