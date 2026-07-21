param(
  [string]$EcsHost = "101.201.63.118",
  [string]$ConsoleUrl = "http://console.qiyuntu.cn",
  [string]$ApiUrl = "http://api.qiyuntu.cn",
  [string]$WidgetUrl = "http://cdn.qiyuntu.cn",
  [string]$SiteUrl = "http://www.qiyuntu.cn",
  [string]$EntryUrl = "http://go.qiyuntu.cn",
  [string]$User = "root",
  [string]$IdentityFile = "$env:USERPROFILE\.ssh\id_ed25519_qiyun",
  [switch]$Bootstrap,
  [switch]$SyncOnly,
  [switch]$UploadEnv
)

$ErrorActionPreference = "Stop"
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$sshTarget = "${User}@${EcsHost}"
$sshArgs = @("-i", $IdentityFile, "-o", "StrictHostKeyChecking=accept-new", $sshTarget)
$productionEnv = Join-Path $RepoRoot ".env.production"

function Sync-Repo {
  Write-Host "==> Syncing deployment source to /opt/qiyun-ai" -ForegroundColor Cyan
  $archive = Join-Path $env:TEMP "qiyun-ai-deploy.tar.gz"
  $items = @(
    "infra", "apps", "packages", "migration", "scripts", ".dockerignore",
    "package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml", "turbo.json",
    "tsconfig.base.json", ".npmrc", ".env.production.http.example"
  )
  $excludeArgs = @(
    "--exclude=.git", "--exclude=node_modules", "--exclude=*/node_modules",
    "--exclude=.next", "--exclude=*/.next", "--exclude=dist", "--exclude=*/dist",
    "--exclude=coverage", "--exclude=*/coverage", "--exclude=.turbo", "--exclude=*/.turbo",
    "--exclude=apps/console/.env.local", "--exclude=apps/console/e2e/screenshots",
    "--exclude=apps/console/e2e/shots", "--exclude=apps/console/e2e/test-results",
    "--exclude=apps/console/e2e/audit-results", "--exclude=apps/console/e2e/playwright-report"
  )

  Push-Location $RepoRoot
  try {
    tar -czf $archive @excludeArgs @items
    if ($LASTEXITCODE -ne 0) { throw "Failed to create deployment archive." }
    scp -i $IdentityFile $archive "${sshTarget}:/tmp/qiyun-ai-deploy.tar.gz"
    if ($LASTEXITCODE -ne 0) { throw "Failed to upload deployment archive." }
    $extract = "mkdir -p /opt/qiyun-ai && " +
      "find /opt/qiyun-ai -mindepth 1 -maxdepth 1 ! -name '.env.production' -exec rm -rf -- {} + && " +
      "tar -xzf /tmp/qiyun-ai-deploy.tar.gz -C /opt/qiyun-ai && rm -f /tmp/qiyun-ai-deploy.tar.gz"
    ssh @sshArgs $extract
    if ($LASTEXITCODE -ne 0) { throw "Failed to extract deployment archive." }
  } finally {
    Pop-Location
    Remove-Item -LiteralPath $archive -Force -ErrorAction SilentlyContinue
  }
}

function Set-EnvValue([string]$Content, [string]$Name, [string]$Value) {
  if ($Content -match "(?m)^$([regex]::Escape($Name))=") {
    return $Content -replace "(?m)^$([regex]::Escape($Name))=.*", "$Name=$Value"
  }
  return "$Content`n$Name=$Value`n"
}

function Upload-EcsEnv {
  if (-not (Test-Path -LiteralPath $productionEnv)) {
    throw "Missing .env.production. Generate and validate it before deployment."
  }

  & powershell -ExecutionPolicy Bypass -File (Join-Path $RepoRoot "scripts\production-preflight.ps1") -EnvFile $productionEnv
  if ($LASTEXITCODE -ne 0) { throw "Production preflight failed." }

  $content = Get-Content -LiteralPath $productionEnv -Raw
  $content = Set-EnvValue $content "APP_URL" $ConsoleUrl
  $content = Set-EnvValue $content "PUBLIC_SITE_URL" $SiteUrl
  $content = Set-EnvValue $content "PUBLIC_API_URL" $ApiUrl
  $content = Set-EnvValue $content "PUBLIC_ENTRY_URL" $EntryUrl
  $content = Set-EnvValue $content "NEXT_PUBLIC_PUBLIC_SITE_URL" $SiteUrl
  $content = Set-EnvValue $content "NEXT_PUBLIC_API_BASE_URL" $ApiUrl
  $content = Set-EnvValue $content "NEXT_PUBLIC_ENTRY_URL" $EntryUrl
  $content = Set-EnvValue $content "NEXT_PUBLIC_WIDGET_URL" $WidgetUrl
  $content = Set-EnvValue $content "WIDGET_CDN_URL" $WidgetUrl
  $content = Set-EnvValue $content "CORS_ORIGIN" "$SiteUrl,$ConsoleUrl,$EntryUrl"
  $content = Set-EnvValue $content "COOKIE_SECURE" $(if ($ConsoleUrl -match '^https://') { "true" } else { "false" })
  $content = Set-EnvValue $content "NODE_ENV" "production"
  $content = Set-EnvValue $content "API_RUNTIME_DRIVER" "postgres"
  $content = Set-EnvValue $content "API_SEED_PREVIEW" "false"
  $content = Set-EnvValue $content "AUTH_SHOW_DEBUG_CODES" "false"
  $content = Set-EnvValue $content "DOCUMENT_QUEUE_DRIVER" "redis"
  $content = Set-EnvValue $content "VECTOR_STORE_DRIVER" "qdrant"
  $content = Set-EnvValue $content "REDIS_URL" "redis://redis:6379"
  $content = Set-EnvValue $content "MINIO_ENDPOINT" "http://minio:9000"
  $content = Set-EnvValue $content "QDRANT_URL" "http://qdrant:6333"

  $tmp = Join-Path $env:TEMP "qiyun-production.env"
  [IO.File]::WriteAllText($tmp, $content, [Text.UTF8Encoding]::new($false))
  try {
    & powershell -ExecutionPolicy Bypass -File (Join-Path $RepoRoot "scripts\production-preflight.ps1") -EnvFile $tmp
    if ($LASTEXITCODE -ne 0) { throw "Rendered ECS environment failed preflight." }
    scp -i $IdentityFile $tmp "${sshTarget}:/opt/qiyun-ai/.env.production"
  } finally {
    Remove-Item -LiteralPath $tmp -Force -ErrorAction SilentlyContinue
  }
  Write-Host "Production environment uploaded." -ForegroundColor Green
}

function Invoke-RemoteDeploy {
  $remote = "cd /opt/qiyun-ai && chmod +x infra/ecs/deploy-full.sh scripts/production-preflight.sh && " +
    "QIYUN_PUBLIC_IP=$EcsHost QIYUN_CONSOLE_URL=$ConsoleUrl QIYUN_API_URL=$ApiUrl " +
    "QIYUN_WIDGET_URL=$WidgetUrl QIYUN_SITE_URL=$SiteUrl QIYUN_ENTRY_URL=$EntryUrl " +
    "./infra/ecs/deploy-full.sh"
  ssh @sshArgs $remote
  if ($LASTEXITCODE -ne 0) { throw "Remote deployment failed." }
}

Write-Host "Target: $sshTarget" -ForegroundColor Cyan

if ($UploadEnv) {
  Upload-EcsEnv
  exit 0
}

Sync-Repo
if ($SyncOnly) { exit 0 }

Upload-EcsEnv
Invoke-RemoteDeploy

Write-Host ""
Write-Host "Deployment finished:" -ForegroundColor Green
Write-Host "  Website: $SiteUrl"
Write-Host "  Console: $ConsoleUrl/login"
Write-Host "  API:     $ApiUrl/health"
Write-Host "  Entry:   $EntryUrl"
Write-Host "  Widget:  $WidgetUrl/public/widget.js"
