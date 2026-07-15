#!/usr/bin/env bash
#
# qiyuntu.cn 域名健康检查脚本
# 用途: 一键检查所有业务子域名的 DNS 解析与 HTTPS 可达性
# 用法:
#   bash scripts/check-domains.sh            # 默认检查 qiyuntu.cn 全系列
#   DNS=8.8.8.8 bash scripts/check-domains.sh   # 指定公共 DNS
#
# 退出码: 0=全部正常, 1=存在未解析/不可达的域名
#
set -u

DNS="${DNS:-223.5.5.5}"

DOMAINS=(
  "qiyuntu.cn"
  "www.qiyuntu.cn"
  "console.qiyuntu.cn"
  "api.qiyuntu.cn"
  "go.qiyuntu.cn"
  "cdn.qiyuntu.cn"
)

# 解析域名 A 记录 (dig 优先, 回退 nslookup)
resolve() {
  local d="$1"
  if command -v dig >/dev/null 2>&1; then
    dig +short +time=5 +tries=1 "@${DNS}" "${d}" A 2>/dev/null | head -n1
  else
    # 仅捕获 "Name:" 之后的 "Address:" 行, 排除 DNS 服务器自身地址
    nslookup -nosearch -type=A "${d}" "${DNS}" 2>&1 \
      | awk '/^Name:/{n=1} n&&/^Address:/{print $2; exit}'
  fi
}

printf "%-24s %-15s %-16s %s\n" "域名" "DNS服务器" "解析IP" "HTTPS状态"
printf "%-24s %-15s %-16s %s\n" "--------------------" "---------------" "----------------" "----------"

FAIL=0
for d in "${DOMAINS[@]}"; do
  ip="$(resolve "$d")"
  if [ -z "$ip" ]; then
    ip="(无记录)"
    FAIL=1
  fi
  code="$(curl -sS -o /dev/null -w "%{http_code}" --max-time 10 "https://${d}" 2>/dev/null)"
  if [ -z "$code" ]; then
    code="CONN_FAIL"
    FAIL=1
  fi
  printf "%-24s %-15s %-16s %s\n" "$d" "$DNS" "$ip" "$code"
done

echo
if [ "$FAIL" -eq 0 ]; then
  echo "✅ 全部域名解析正常且可访问"
  exit 0
else
  echo "⚠️  存在未解析或不可达的域名, 请到 DNS 托管商后台补记录"
  exit 1
fi
