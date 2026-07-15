# Qiyun AI automated test runner — see docs/14-automated-test-plan.md
param(
  [switch]$SkipBuild,
  [switch]$SkipLint
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

$env:CI = "1"
$env:NODE_ENV = "test"
$env:NEXT_TELEMETRY_DISABLED = "1"

$ConsoleRoot = Join-Path $Root "apps\console"
$ApiRoot = Join-Path $Root "apps\api"
$WorkerRoot = Join-Path $Root "apps\worker"

function Resolve-ExistingPath([string[]]$Candidates, [string]$Label) {
  foreach ($candidate in $Candidates) {
    if ($candidate -and (Test-Path $candidate)) {
      return $candidate
    }
  }

  throw "$Label not found. Checked: $($Candidates -join ', ')"
}

$Tsc = Resolve-ExistingPath @(
  (Join-Path $ApiRoot "node_modules\typescript\lib\tsc.js"),
  (Join-Path $WorkerRoot "node_modules\typescript\lib\tsc.js"),
  (Join-Path $Root "node_modules\typescript\lib\tsc.js")
) "TypeScript"

$Next = Resolve-ExistingPath @(
  (Join-Path $ConsoleRoot "node_modules\next\dist\bin\next"),
  (Join-Path $Root "node_modules\next\dist\bin\next")
) "Next.js"

function Step([string]$Name, [scriptblock]$Action) {
  Write-Host ""
  Write-Host "==> $Name" -ForegroundColor Cyan
  $sw = [System.Diagnostics.Stopwatch]::StartNew()
  & $Action
  if ($LASTEXITCODE -ne 0) { throw "$Name failed (exit $LASTEXITCODE)" }
  $sw.Stop()
  Write-Host ("    done in {0:N1}s" -f $sw.Elapsed.TotalSeconds) -ForegroundColor DarkGray
}

$started = Get-Date
$results = [ordered]@{}

try {
  if (-not $SkipLint) {
    Step "L0 console lint" {
      Set-Location $ConsoleRoot
      node $Next lint
      Set-Location $Root
    }
    $results["console-lint"] = "pass"
  }

  Step "L0 api compile" {
    node $Tsc -p apps/api/tsconfig.json
    node -e "require('fs').cpSync('apps/api/assets','apps/api/dist/assets',{recursive:true})"
  }
  $results["api-compile"] = "pass"

  Step "L0 worker compile" {
    node $Tsc -p apps/worker/tsconfig.json
  }
  $results["worker-compile"] = "pass"

  Step "L1 API tests (72 pass + 3 skip)" {
    node scripts/run-api-tests.mjs
  }
  $results["api-test"] = "pass"

  Step "L1 Console tests" {
    node scripts/run-console-tests.mjs
  }
  $results["console-test"] = "pass"

  if (-not $SkipBuild) {
    Step "L2 Console build" {
      Set-Location $ConsoleRoot
      node $Next build
      Set-Location $Root
    }
    $results["console-build"] = "pass"
  }

  $elapsed = (Get-Date) - $started
  Write-Host ""
  Write-Host ("ALL PASSED in {0:mm\:ss}" -f $elapsed) -ForegroundColor Green
  $results.GetEnumerator() | ForEach-Object { Write-Host ("  {0,-18} {1}" -f $_.Key, $_.Value) }
  exit 0
}
catch {
  Write-Host ""
  Write-Host "FAILED: $_" -ForegroundColor Red
  Set-Location $Root
  exit 1
}
