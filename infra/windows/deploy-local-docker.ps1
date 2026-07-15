# 本地全栈 Docker 部署（一键）
# 前置：Docker Desktop 已启动且 Linux Engine 可用
# 用法（PowerShell，仓库根目录）：
#   pwsh -ExecutionPolicy Bypass -File infra/windows/deploy-local-docker.ps1
#   pwsh -ExecutionPolicy Bypass -File infra/windows/deploy-local-docker.ps1 -SkipBuild

param(
  [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"
$Root = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
$Compose = Join-Path $Root "infra/docker-compose.yml"

Write-Host "==> 校验 .env" -ForegroundColor Cyan
if (-not (Test-Path (Join-Path $Root ".env"))) {
  Write-Host "[FAIL] 根目录缺少 .env，请先复制并填写：" -ForegroundColor Red
  Write-Host "       cp .env.example .env" -ForegroundColor Yellow
  exit 1
}

Write-Host "==> 启动中间件（postgres/redis/minio/qdrant）" -ForegroundColor Cyan
docker compose -f $Compose up -d postgres redis minio qdrant

Write-Host "==> 等待中间件健康…" -ForegroundColor Cyan
$ready = $false
for ($i = 0; $i -lt 30; $i++) {
  $pg = docker inspect -f '{{.State.Health.Status}}' qiyun-postgres 2>$null
  $rd = docker inspect -f '{{.State.Health.Status}}' qiyun-redis 2>$null
  $mn = docker inspect -f '{{.State.Health.Status}}' qiyun-minio 2>$null
  if ($pg -eq "healthy" -and $rd -eq "healthy" -and $mn -eq "healthy") {
    $ready = $true; break
  }
  Start-Sleep -Seconds 5
}
if (-not $ready) {
  Write-Host "[WARN] 中间件未在 150s 内全部健康，继续尝试（可能 qdrant 无 healthcheck）" -ForegroundColor Yellow
}

Write-Host "==> 运行 migration" -ForegroundColor Cyan
docker compose -f $Compose --profile ops run --rm migrate

Write-Host "==> 构建并启动 api / worker / console" -ForegroundColor Cyan
if ($SkipBuild) {
  docker compose -f $Compose up -d api worker console
} else {
  docker compose -f $Compose up -d --build api worker console
}

Write-Host "==> 服务状态" -ForegroundColor Cyan
docker compose -f $Compose ps

Write-Host ""
Write-Host "==> 探活" -ForegroundColor Cyan
Start-Sleep -Seconds 10
try {
  $health = Invoke-RestMethod -Uri "http://localhost:3001/health" -TimeoutSec 10
  $health | ConvertTo-Json -Depth 3 | Write-Host
} catch {
  Write-Host "[WARN] /health 暂未就绪，稍后手动访问 http://localhost:3001/health" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "部署完成。" -ForegroundColor Green
Write-Host "  Console: http://localhost:3000" -ForegroundColor White
Write-Host "  API:     http://localhost:3001/health" -ForegroundColor White
Write-Host "  MinIO:   http://localhost:9001 (minioadmin/minioadmin)" -ForegroundColor White
