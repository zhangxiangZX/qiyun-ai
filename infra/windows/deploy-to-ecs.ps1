param(
  [string]$EcsHost = "101.201.63.118",
  [string]$ConsoleUrl = "https://console.qiyuntu.cn",
  [string]$ApiUrl = "https://api.qiyuntu.cn",
  [string]$WidgetUrl = "https://cdn.qiyuntu.cn",
  [string]$SiteUrl = "https://www.qiyuntu.cn",
  [string]$EntryUrl = "https://go.qiyuntu.cn",
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

Write-Host "目标: $sshTarget" -ForegroundColor Cyan
Write-Host "仓库: $RepoRoot"

function Sync-Repo {
  Write-Host "==> 同步代码到 /opt/qiyun-ai ..."
  ssh @sshArgs "mkdir -p /opt/qiyun-ai"
  scp -i $IdentityFile -r "$RepoRoot\infra" "${sshTarget}:/opt/qiyun-ai/"
  scp -i $IdentityFile -r "$RepoRoot\apps" "${sshTarget}:/opt/qiyun-ai/"
  scp -i $IdentityFile -r "$RepoRoot\packages" "${sshTarget}:/opt/qiyun-ai/"
  scp -i $IdentityFile -r "$RepoRoot\migration" "${sshTarget}:/opt/qiyun-ai/"
  scp -i $IdentityFile "$RepoRoot\package.json" "$RepoRoot\pnpm-lock.yaml" "$RepoRoot\pnpm-workspace.yaml" "$RepoRoot\turbo.json" "$RepoRoot\tsconfig.base.json" "$RepoRoot\.npmrc" "${sshTarget}:/opt/qiyun-ai/"
  Write-Host "同步完成" -ForegroundColor Green
}

function Upload-EcsEnv {
  $localEnv = Join-Path $RepoRoot ".env"
  if (-not (Test-Path $localEnv)) {
    throw "本地缺少 .env，请先配置或手动在 ECS 上编辑 /opt/qiyun-ai/.env"
  }
  $content = Get-Content $localEnv -Raw
  $corsOrigin = "$SiteUrl,$ConsoleUrl,$EntryUrl"
  $content = $content -replace '(?m)^APP_URL=.*', "APP_URL=$ConsoleUrl"
  $content = $content -replace '(?m)^CORS_ORIGIN=.*', "CORS_ORIGIN=$corsOrigin"
  $content = $content -replace '(?m)^NEXT_PUBLIC_WIDGET_URL=.*', "NEXT_PUBLIC_WIDGET_URL=$WidgetUrl"
  if ($content -match '(?m)^PUBLIC_API_URL=') {
    $content = $content -replace '(?m)^PUBLIC_API_URL=.*', "PUBLIC_API_URL=$ApiUrl"
  } else {
    $content += "`nPUBLIC_API_URL=$ApiUrl`n"
  }
  if ($content -match '(?m)^PUBLIC_SITE_URL=') {
    $content = $content -replace '(?m)^PUBLIC_SITE_URL=.*', "PUBLIC_SITE_URL=$SiteUrl"
  } else {
    $content += "`nPUBLIC_SITE_URL=$SiteUrl`n"
  }
  if ($content -match '(?m)^PUBLIC_ENTRY_URL=') {
    $content = $content -replace '(?m)^PUBLIC_ENTRY_URL=.*', "PUBLIC_ENTRY_URL=$EntryUrl"
  } else {
    $content += "`nPUBLIC_ENTRY_URL=$EntryUrl`n"
  }
  if ($ConsoleUrl -match '^https://') {
    if ($content -match '(?m)^COOKIE_SECURE=') {
      $content = $content -replace '(?m)^COOKIE_SECURE=.*', 'COOKIE_SECURE=true'
    } else {
      $content += "`nCOOKIE_SECURE=true`n"
    }
  }
  $content = $content -replace '(?m)^NODE_ENV=.*', "NODE_ENV=production"
  if ($content -notmatch '(?m)^API_RUNTIME_DRIVER=') { $content += "`nAPI_RUNTIME_DRIVER=postgres`n" }
  $content = $content -replace '(?m)^API_RUNTIME_DRIVER=.*', "API_RUNTIME_DRIVER=postgres"
  if ($content -notmatch '(?m)^DOCUMENT_QUEUE_DRIVER=') { $content += "DOCUMENT_QUEUE_DRIVER=redis`n" }
  $content = $content -replace '(?m)^DOCUMENT_QUEUE_DRIVER=.*', "DOCUMENT_QUEUE_DRIVER=redis"
  if ($content -notmatch '(?m)^VECTOR_STORE_DRIVER=') { $content += "VECTOR_STORE_DRIVER=qdrant`n" }
  $content = $content -replace '(?m)^VECTOR_STORE_DRIVER=.*', "VECTOR_STORE_DRIVER=qdrant"
  # Docker 内网地址
  $content = $content -replace '(?m)^DATABASE_URL=.*', 'DATABASE_URL=postgresql://postgres:${POSTGRES_PASSWORD}@postgres:5432/qiyun_ai'
  $content = $content -replace '(?m)^REDIS_URL=.*', "REDIS_URL=redis://redis:6379"
  $content = $content -replace '(?m)^MINIO_ENDPOINT=.*', "MINIO_ENDPOINT=http://minio:9000"
  $content = $content -replace '(?m)^QDRANT_URL=.*', "QDRANT_URL=http://qdrant:6333"
  $tmp = Join-Path $env:TEMP "qiyun-ecs.env"
  Set-Content -Path $tmp -Value $content -Encoding UTF8
  scp -i $IdentityFile $tmp "${sshTarget}:/opt/qiyun-ai/.env"
  Remove-Item $tmp -Force
  Write-Host "已上传 ECS .env（含 LLM 等密钥，请勿泄露）" -ForegroundColor Green
}

if ($UploadEnv) {
  Upload-EcsEnv
  exit 0
}

if ($SyncOnly) {
  Sync-Repo
  exit 0
}

if ($Bootstrap) {
  Write-Host "==> 首次 bootstrap（安装 Docker/Nginx + 部署）"
  Sync-Repo
  if (Test-Path (Join-Path $RepoRoot ".env")) {
    Upload-EcsEnv
  }
  ssh @sshArgs "cd /opt/qiyun-ai && chmod +x infra/ecs/deploy-full.sh infra/ecs/bootstrap-ecs.sh && QIYUN_PUBLIC_IP=$EcsHost QIYUN_CONSOLE_URL=$ConsoleUrl QIYUN_API_URL=$ApiUrl ./infra/ecs/deploy-full.sh"
  exit $LASTEXITCODE
}

Sync-Repo
if (Test-Path (Join-Path $RepoRoot ".env")) {
  Upload-EcsEnv
}
Write-Host "==> 远程 deploy-full ..."
ssh @sshArgs "cd /opt/qiyun-ai && chmod +x infra/ecs/deploy-full.sh && QIYUN_PUBLIC_IP=$EcsHost ./infra/ecs/deploy-full.sh"

Write-Host ""
Write-Host "访问地址:" -ForegroundColor Green
Write-Host "  API:     http://${EcsHost}/health"
Write-Host "  Console: http://${EcsHost}:8080/login"
Write-Host "  试用:    http://${EcsHost}:8080/trial"
