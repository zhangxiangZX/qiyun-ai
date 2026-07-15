param(
  [string]$EnvFile = ".env.production"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $EnvFile)) {
  throw "Production env file not found: $EnvFile"
}

$values = @{}
Get-Content -LiteralPath $EnvFile | ForEach-Object {
  if ($_ -match '^([A-Z0-9_]+)=(.*)$') {
    $values[$matches[1]] = $matches[2].Trim()
  }
}

$required = @(
  "APP_URL", "PUBLIC_SITE_URL", "PUBLIC_ENTRY_URL", "PUBLIC_API_URL",
  "NEXT_PUBLIC_WIDGET_URL", "CORS_ORIGIN", "DATABASE_URL", "POSTGRES_PASSWORD",
  "MINIO_ACCESS_KEY", "MINIO_SECRET_KEY", "JWT_SECRET", "JWT_REFRESH_SECRET",
  "LLM_API_KEY", "LLM_EMBEDDING_API_KEY", "PLATFORM_ADMIN_EMAIL",
  "PLATFORM_ADMIN_PASSWORD"
)

$errors = @()
foreach ($key in $required) {
  $value = $values[$key]
  if ([string]::IsNullOrWhiteSpace($value)) {
    $errors += "$key is missing"
  } elseif ($value -match 'REPLACE_|change-me|replace-me|minioadmin') {
    $errors += "$key still uses a placeholder/default"
  }
}

if ($values["API_RUNTIME_DRIVER"] -ne "postgres") { $errors += "API_RUNTIME_DRIVER must be postgres" }
if ($values["API_SEED_PREVIEW"] -ne "false") { $errors += "API_SEED_PREVIEW must be false" }
if ($values["AUTH_SHOW_DEBUG_CODES"] -ne "false") { $errors += "AUTH_SHOW_DEBUG_CODES must be false" }
$jwtSecret = [string]$values["JWT_SECRET"]
$jwtRefreshSecret = [string]$values["JWT_REFRESH_SECRET"]
if ($jwtSecret.Length -lt 32) { $errors += "JWT_SECRET must be at least 32 characters" }
if ($jwtRefreshSecret.Length -lt 32) { $errors += "JWT_REFRESH_SECRET must be at least 32 characters" }
if ($values["JWT_SECRET"] -eq $values["JWT_REFRESH_SECRET"]) { $errors += "JWT secrets must be different" }

if ($errors.Count -gt 0) {
  $errors | ForEach-Object { Write-Error $_ }
  exit 1
}

Write-Host "Production preflight passed for $EnvFile" -ForegroundColor Green
