# Create the first batch of GitHub Issues for Qiyun AI.
# Usage: powershell -ExecutionPolicy Bypass -File scripts/create-gh-seed-issues.ps1

$ErrorActionPreference = "Stop"

$Repo = "zhangxiangZX/qiyun-ai"
$Gh = Join-Path $PSScriptRoot "gh.ps1"

& $Gh auth status 2>$null
if ($LASTEXITCODE -ne 0) {
  Write-Host "GitHub CLI is not logged in." -ForegroundColor Yellow
  Write-Host "Run: .\scripts\gh.ps1 auth login --hostname github.com --web --git-protocol ssh"
  exit 1
}

function New-TaskIssue {
  param([hashtable]$Task)

  $taskId = $Task.TaskId
  $existing = & $Gh issue list --repo $Repo --state open --search "$taskId in:title" --json number --jq ".[0].number" 2>$null
  if ($existing) {
    Write-Host "Skip $taskId, issue #$existing already exists."
    return
  }

  $body = @"
## Task ID

$($Task.TaskId)

## Owner

$($Task.Owner)

## Branch

$($Task.Branch)

## Allowed Scope

$($Task.Scope)

## Depends On

$($Task.DependsOn)

## Requirements

$($Task.Requirements)

## Acceptance Criteria

$($Task.Acceptance)

## Test Plan

$($Task.TestPlan)

## Handoff

- Update TASKS.md when this task moves to Review or Done.
- Open a PR with .github/PULL_REQUEST_TEMPLATE.md.
- Keep changes inside the allowed scope unless the reviewer approves expanding it.
"@

  $labelArg = ($Task.Labels -join ",")
  & $Gh issue create --repo $Repo --title "[Task] $($Task.TaskId) $($Task.Title)" --label $labelArg --body $body
}

$tasks = @(
  @{
    TaskId = "P-01"
    Title = "Console shell layout"
    Owner = "Cursor"
    Branch = "feature/P-01-console-shell"
    Scope = "apps/console/**, packages/ui/**"
    DependsOn = "A-05"
    Requirements = @'
1. Build login page, sidebar, topbar, and main content shell.
2. Use existing design tokens and shared UI components.
3. Cover loading, empty, error, and success states.
4. Support desktop and mobile layouts.
'@
    Acceptance = @'
- [ ] Works on desktop and mobile.
- [ ] Does not modify backend, database, Docker, or auth logic.
- [ ] lint and typecheck pass.
'@
    TestPlan = @'
- pnpm --filter qiyun-console lint
- pnpm --filter qiyun-console typecheck
'@
    Labels = @("task", "cursor", "area:console", "priority:p1")
  },
  @{
    TaskId = "B-01"
    Title = "Auth register login and JWT refresh"
    Owner = "Codex"
    Branch = "feature/B-01-auth"
    Scope = "apps/api/**, migration/**, packages/config/**"
    DependsOn = "A-04"
    Requirements = @'
1. Implement register, login, and refresh token flow.
2. Store passwords securely.
3. Include user_id and workspace context in JWT payload.
4. Add basic auth tests.
'@
    Acceptance = @'
- [ ] Successful login returns access token and refresh token.
- [ ] Invalid credentials return the standard error shape.
- [ ] Auth tests cover success, failure, and expired token cases.
'@
    TestPlan = @'
- pnpm --filter qiyun-api lint
- pnpm --filter qiyun-api typecheck
- pnpm --filter qiyun-api test
'@
    Labels = @("task", "codex", "area:api", "priority:p1")
  },
  @{
    TaskId = "B-02"
    Title = "Workspace creation and current workspace switch"
    Owner = "Codex"
    Branch = "feature/B-02-workspace-switch"
    Scope = "apps/api/**, migration/**"
    DependsOn = "B-01"
    Requirements = @'
1. Implement workspace create and list APIs.
2. Define how current workspace context is passed.
3. Validate membership on all workspace-scoped APIs.
'@
    Acceptance = @'
- [ ] Users can only access workspaces they belong to.
- [ ] API contract is documented in docs/05-api-contract.md.
- [ ] Permission tests cover cross-tenant access denial.
'@
    TestPlan = @'
- pnpm --filter qiyun-api lint
- pnpm --filter qiyun-api typecheck
- pnpm --filter qiyun-api test
'@
    Labels = @("task", "codex", "area:api", "priority:p1")
  },
  @{
    TaskId = "C-01"
    Title = "Knowledge base CRUD"
    Owner = "Codex"
    Branch = "feature/C-01-knowledge-crud"
    Scope = "apps/api/**, migration/**"
    DependsOn = "B-02"
    Requirements = @'
1. Implement knowledge base create, list, detail, update, and soft delete.
2. Scope every query by workspace_id.
3. Handle soft-delete uniqueness according to project-book recommendations.
'@
    Acceptance = @'
- [ ] A deleted knowledge base name can be reused.
- [ ] Cross-workspace read and write attempts are denied.
- [ ] CRUD unit and integration tests pass.
'@
    TestPlan = @'
- pnpm --filter qiyun-api lint
- pnpm --filter qiyun-api typecheck
- pnpm --filter qiyun-api test
'@
    Labels = @("task", "codex", "area:api", "priority:p1")
  },
  @{
    TaskId = "C-09"
    Title = "Knowledge UI and file status display"
    Owner = "Cursor"
    Branch = "feature/C-09-knowledge-ui"
    Scope = "apps/console/**, packages/ui/**"
    DependsOn = "C-01, C-02, C-03 API contract"
    Requirements = @'
1. Implement knowledge list, detail, and file status views.
2. Show uploading, processing, completed, and failed states.
3. Cover empty, error, and loading states.
'@
    Acceptance = @'
- [ ] API calls follow docs/05-api-contract.md.
- [ ] Mobile layout is usable.
- [ ] lint and typecheck pass.
'@
    TestPlan = @'
- pnpm --filter qiyun-console lint
- pnpm --filter qiyun-console typecheck
'@
    Labels = @("task", "cursor", "area:console", "priority:p1")
  }
)

foreach ($task in $tasks) {
  New-TaskIssue -Task $task
}

Write-Host "Seed issues created for $Repo."
