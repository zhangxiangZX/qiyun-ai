# Windows 本地联调（E 盘仓库）
# 用法: powershell -ExecutionPolicy Bypass -File infra/windows/dev.ps1

$ErrorActionPreference = "Stop"
$Root = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
Set-Location $Root

if (-not (Test-Path "$Root\.env")) {
  Copy-Item "$Root\.env.example" "$Root\.env"
  Write-Host "已创建 $Root\.env，请按需填写 LLM_API_KEY 后重新运行。" -ForegroundColor Yellow
}

$DataDir = "$Root\.data\documents"
New-Item -ItemType Directory -Force -Path $DataDir | Out-Null

$envContent = Get-Content "$Root\.env" -Raw
if ($envContent -notmatch "(?m)^DOCUMENT_STORAGE_DIR=") {
  Add-Content "$Root\.env" "`nDOCUMENT_STORAGE_DIR=$($DataDir -replace '\\','/')"
}
if ($envContent -notmatch "(?m)^NEXT_PUBLIC_WIDGET_URL=") {
  Add-Content "$Root\.env" "NEXT_PUBLIC_WIDGET_URL=http://localhost:3001"
}

Write-Host "==> 仓库: $Root"
Write-Host "==> pnpm store: $(pnpm store path)"
Write-Host "==> 文档存储: $DataDir"
Write-Host ""
Write-Host "启动 API (3001) 与 Console (3000)..."
Write-Host "Console: http://localhost:3000"
Write-Host "API:     http://localhost:3001/health"
Write-Host ""

pnpm --filter qiyun-api dev
