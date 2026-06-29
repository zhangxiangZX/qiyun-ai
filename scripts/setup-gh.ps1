# GitHub CLI setup for Windows + qiyun-ai
# Usage: powershell -ExecutionPolicy Bypass -File scripts/setup-gh.ps1

$ErrorActionPreference = "Stop"

function Test-GhInstalled {
    return [bool](Get-Command gh -ErrorAction SilentlyContinue)
}

function Install-Gh {
    Write-Host "Installing GitHub CLI via winget..."
    winget install --id GitHub.cli -e --accept-source-agreements --accept-package-agreements --scope user
}

function Test-GhAuth {
    gh auth status 2>$null
    return $LASTEXITCODE -eq 0
}

Write-Host "=== GitHub CLI Setup ===" -ForegroundColor Cyan

if (-not (Test-GhInstalled)) {
    Install-Gh
} else {
    Write-Host "GitHub CLI already installed: $(gh --version)"
}

if (-not (Test-GhAuth)) {
    Write-Host ""
    Write-Host "Not authenticated. Run:" -ForegroundColor Yellow
    Write-Host "  gh auth login" -ForegroundColor White
    Write-Host ""
    Write-Host "Recommended options:"
    Write-Host "  - GitHub.com"
    Write-Host "  - HTTPS"
    Write-Host "  - Login with browser"
    exit 1
}

Write-Host ""
Write-Host "GitHub CLI is ready." -ForegroundColor Green
gh auth status

$repoRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $repoRoot

$remote = git remote get-url origin 2>$null
if (-not $remote) {
    Write-Host ""
    Write-Host "No git remote configured. To create and push this repo:" -ForegroundColor Yellow
    Write-Host "  gh repo create qiyun-ai --private --source=. --remote=origin --push"
}
