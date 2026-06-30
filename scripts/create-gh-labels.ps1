# Sync the standard labels used by the Qiyun AI project workflow.
# Usage: powershell -ExecutionPolicy Bypass -File scripts/create-gh-labels.ps1

$ErrorActionPreference = "Stop"

$Repo = "zhangxiangZX/qiyun-ai"
$Gh = Join-Path $PSScriptRoot "gh.ps1"

& $Gh auth status 2>$null
if ($LASTEXITCODE -ne 0) {
  Write-Host "GitHub CLI is not logged in." -ForegroundColor Yellow
  Write-Host "Run: .\scripts\gh.ps1 auth login --hostname github.com --web --git-protocol ssh"
  exit 1
}

$labels = @(
  @{ Name = "task"; Color = "2f6fed"; Description = "Scoped implementation task" },
  @{ Name = "bug"; Color = "d73a4a"; Description = "Reproducible bug or regression" },
  @{ Name = "needs-triage"; Color = "ededed"; Description = "Needs owner, priority, or scope confirmation" },
  @{ Name = "blocked"; Color = "b60205"; Description = "Cannot move forward without another task or decision" },
  @{ Name = "review"; Color = "fbca04"; Description = "Ready for human or agent review" },
  @{ Name = "cursor"; Color = "7c3aed"; Description = "Owned by Cursor frontend/UI workflow" },
  @{ Name = "codex"; Color = "0e8a16"; Description = "Owned by Codex backend/engineering workflow" },
  @{ Name = "area:console"; Color = "c5def5"; Description = "Console frontend" },
  @{ Name = "area:api"; Color = "c5def5"; Description = "Backend API" },
  @{ Name = "area:worker"; Color = "c5def5"; Description = "Worker and queues" },
  @{ Name = "area:widget"; Color = "c5def5"; Description = "Website widget" },
  @{ Name = "area:infra"; Color = "c5def5"; Description = "Infrastructure and deployment" },
  @{ Name = "priority:p0"; Color = "b60205"; Description = "Release blocker" },
  @{ Name = "priority:p1"; Color = "d93f0b"; Description = "Important for current milestone" },
  @{ Name = "priority:p2"; Color = "fbca04"; Description = "Normal priority" }
)

foreach ($label in $labels) {
  $name = $label.Name
  $color = $label.Color
  $description = $label.Description

  & $Gh label create $name --repo $Repo --color $color --description $description 2>$null
  if ($LASTEXITCODE -ne 0) {
    & $Gh label edit $name --repo $Repo --color $color --description $description
  }
}

Write-Host "GitHub labels synced for $Repo."
