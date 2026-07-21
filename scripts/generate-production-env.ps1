param(
  [string]$SourceEnv = ".env",
  [string]$Template = ".env.production.http.example",
  [string]$Output = ".env.production",
  [switch]$Force
)

$ErrorActionPreference = "Stop"

function New-HexSecret([int]$Bytes) {
  $buffer = New-Object byte[] $Bytes
  $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
  try { $rng.GetBytes($buffer) } finally { $rng.Dispose() }
  return ([BitConverter]::ToString($buffer) -replace "-", "").ToLowerInvariant()
}

function Read-Env([string]$Path) {
  $result = @{}
  if (-not (Test-Path -LiteralPath $Path)) { return $result }
  Get-Content -LiteralPath $Path | ForEach-Object {
    if ($_ -match '^([A-Z0-9_]+)=(.*)$') { $result[$matches[1]] = $matches[2].Trim() }
  }
  return $result
}

function Set-EnvValue([string]$Content, [string]$Name, [string]$Value) {
  $escaped = [regex]::Escape($Name)
  if ($Content -match "(?m)^${escaped}=") {
    return $Content -replace "(?m)^${escaped}=.*", "$Name=$Value"
  }
  return "$Content`n$Name=$Value`n"
}

if (-not (Test-Path -LiteralPath $Template)) { throw "Template not found: $Template" }
if ((Test-Path -LiteralPath $Output) -and -not $Force) {
  throw "$Output already exists. Use -Force only when intentionally rotating all generated secrets."
}

$source = Read-Env $SourceEnv
$content = Get-Content -LiteralPath $Template -Raw
$databasePassword = New-HexSecret 24

$settings = [ordered]@{
  DATABASE_URL = "postgresql://postgres:${databasePassword}@postgres:5432/qiyun_ai"
  POSTGRES_PASSWORD = $databasePassword
  MINIO_ACCESS_KEY = "qiyun$(New-HexSecret 8)"
  MINIO_SECRET_KEY = New-HexSecret 24
  JWT_SECRET = New-HexSecret 48
  JWT_REFRESH_SECRET = New-HexSecret 48
  LLM_API_KEY = [string]$source["LLM_API_KEY"]
  LLM_EMBEDDING_API_KEY = [string]$source["LLM_EMBEDDING_API_KEY"]
  RESEND_API_KEY = [string]$source["RESEND_API_KEY"]
  PLATFORM_ADMIN_EMAIL = [string]$source["PLATFORM_ADMIN_EMAIL"]
  PLATFORM_ADMIN_PASSWORD = [string]$source["PLATFORM_ADMIN_PASSWORD"]
  PLATFORM_ADMIN_NAME = "Qiyun Platform Admin"
  API_RUNTIME_DRIVER = "postgres"
  API_SEED_PREVIEW = "false"
  AUTH_SHOW_DEBUG_CODES = "false"
  COOKIE_SECURE = "false"
}

foreach ($item in $settings.GetEnumerator()) {
  $content = Set-EnvValue $content $item.Key $item.Value
}

$absoluteOutput = [IO.Path]::GetFullPath($Output)
[IO.File]::WriteAllText($absoluteOutput, $content, (New-Object Text.UTF8Encoding($false)))
Write-Host "Generated $absoluteOutput. Secret values were not printed." -ForegroundColor Green
