# Fast test runner — API + Console unit tests only (~15s)
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root
$env:NODE_ENV = "test"

Write-Host "==> Quick tests (no lint/build)" -ForegroundColor Cyan
node scripts/run-api-tests.mjs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
node scripts/run-console-tests.mjs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host "Quick tests passed." -ForegroundColor Green
