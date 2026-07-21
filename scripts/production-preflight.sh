#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${1:-.env.production}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Production env file not found: $ENV_FILE" >&2
  exit 1
fi

declare -A values=()
while IFS='=' read -r key value; do
  [[ "$key" =~ ^[A-Z0-9_]+$ ]] || continue
  value="${value%$'\r'}"
  values["$key"]="$value"
done < "$ENV_FILE"

required=(
  APP_URL PUBLIC_SITE_URL PUBLIC_ENTRY_URL PUBLIC_API_URL NEXT_PUBLIC_WIDGET_URL
  CORS_ORIGIN DATABASE_URL POSTGRES_PASSWORD MINIO_ACCESS_KEY MINIO_SECRET_KEY
  JWT_SECRET JWT_REFRESH_SECRET LLM_API_KEY LLM_EMBEDDING_API_KEY
  PLATFORM_ADMIN_EMAIL PLATFORM_ADMIN_PASSWORD
)

errors=()
for key in "${required[@]}"; do
  value="${values[$key]:-}"
  if [[ -z "$value" ]]; then
    errors+=("$key is missing")
  elif [[ "$value" =~ REPLACE_|CHANGE_|change-me|replace-me|minioadmin ]]; then
    errors+=("$key still uses a placeholder/default")
  fi
done

[[ "${values[API_RUNTIME_DRIVER]:-}" == "postgres" ]] || errors+=("API_RUNTIME_DRIVER must be postgres")
[[ "${values[API_SEED_PREVIEW]:-}" == "false" ]] || errors+=("API_SEED_PREVIEW must be false")
[[ "${values[AUTH_SHOW_DEBUG_CODES]:-}" == "false" ]] || errors+=("AUTH_SHOW_DEBUG_CODES must be false")

jwt_secret="${values[JWT_SECRET]:-}"
jwt_refresh="${values[JWT_REFRESH_SECRET]:-}"
(( ${#jwt_secret} >= 32 )) || errors+=("JWT_SECRET must be at least 32 characters")
(( ${#jwt_refresh} >= 32 )) || errors+=("JWT_REFRESH_SECRET must be at least 32 characters")
[[ "$jwt_secret" != "$jwt_refresh" ]] || errors+=("JWT secrets must be different")

if [[ "${values[EMAIL_PROVIDER]:-}" == "resend" ]]; then
  resend_key="${values[RESEND_API_KEY]:-}"
  if [[ -z "$resend_key" || "$resend_key" =~ REPLACE_|change-me|replace-me ]]; then
    errors+=("RESEND_API_KEY is required when EMAIL_PROVIDER=resend")
  fi
fi

app_url="${values[APP_URL]:-}"
cookie_secure="${values[COOKIE_SECURE]:-}"
if [[ "$app_url" == https://* && "$cookie_secure" != "true" ]]; then
  errors+=("COOKIE_SECURE must be true for HTTPS")
elif [[ "$app_url" == http://* && "$cookie_secure" != "false" ]]; then
  errors+=("COOKIE_SECURE must be false for temporary HTTP deployment")
fi

if (( ${#errors[@]} > 0 )); then
  printf 'Production preflight failed:\n' >&2
  printf '  - %s\n' "${errors[@]}" >&2
  exit 1
fi

echo "Production preflight passed for $ENV_FILE"
