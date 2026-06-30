# Create or reuse the GitHub Project used by Qiyun AI.
# Usage: powershell -ExecutionPolicy Bypass -File scripts/create-gh-project.ps1
#
# If GitHub asks for project permission, run:
# .\scripts\gh.ps1 auth refresh -s project

$ErrorActionPreference = "Stop"

$Owner = "zhangxiangZX"
$Repo = "qiyun-ai"
$Title = "Qiyun AI Enterprise Platform"
$Gh = Join-Path $PSScriptRoot "gh.ps1"

& $Gh auth status 2>$null
if ($LASTEXITCODE -ne 0) {
  Write-Host "GitHub CLI is not logged in." -ForegroundColor Yellow
  Write-Host "Run: .\scripts\gh.ps1 auth login --hostname github.com --web --git-protocol ssh"
  Write-Host "Then run: .\scripts\gh.ps1 auth refresh -h github.com -s project"
  exit 1
}

$projectNumber = & $Gh project list --owner $Owner --format json --jq ".projects[] | select(.title == `"$Title`") | .number" 2>$null

if (-not $projectNumber) {
  Write-Host "Creating GitHub Project: $Title"
  $projectNumber = & $Gh project create --owner $Owner --title $Title --format json --jq ".number"
} else {
  Write-Host "Reusing GitHub Project #${projectNumber}: $Title"
}

function New-ProjectField {
  param(
    [string]$Name,
    [string]$Type,
    [string]$Options = ""
  )

  $args = @(
    "project",
    "field-create",
    $projectNumber,
    "--owner",
    $Owner,
    "--name",
    $Name,
    "--data-type",
    $Type
  )

  if ($Options) {
    $args += @("--single-select-options", $Options)
  }

  & $Gh @args 2>$null
  if ($LASTEXITCODE -eq 0) {
    Write-Host "Created field: $Name"
  } else {
    Write-Host "Field exists or could not be created: $Name"
  }
}

New-ProjectField -Name "Status" -Type "SINGLE_SELECT" -Options "Inbox,Ready,In Progress,Review,Blocked,Done"
New-ProjectField -Name "Owner" -Type "SINGLE_SELECT" -Options "You,Cursor,Codex"
New-ProjectField -Name "Area" -Type "SINGLE_SELECT" -Options "Console,API,Worker,Widget,Infra,Docs"
New-ProjectField -Name "Priority" -Type "SINGLE_SELECT" -Options "P0,P1,P2"
New-ProjectField -Name "Branch" -Type "TEXT"
New-ProjectField -Name "Scope" -Type "TEXT"
New-ProjectField -Name "Depends on" -Type "TEXT"
New-ProjectField -Name "Milestone" -Type "SINGLE_SELECT" -Options "MVP,Hardening,Launch"

& $Gh project link $projectNumber --owner $Owner --repo "$Owner/$Repo" 2>$null
if ($LASTEXITCODE -eq 0) {
  Write-Host "Linked project #$projectNumber to $Owner/$Repo."
} else {
  Write-Host "Project link skipped or already exists."
}

Write-Host "GitHub Project ready: #$projectNumber"
