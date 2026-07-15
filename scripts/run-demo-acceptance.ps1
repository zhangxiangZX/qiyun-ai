param(
  [string]$ConsoleBaseUrl = "http://localhost:3000",
  [string]$ApiBaseUrl = "http://localhost:3001",
  [switch]$AllowDegradedHealth
)

$ErrorActionPreference = "Stop"

function Invoke-CurlRequest {
  param(
    [string]$Url
  )

  $tempBody = [System.IO.Path]::GetTempFileName()
  try {
    $headers = & curl.exe -sS -D - -o $tempBody --max-redirs 0 $Url 2>$null
    $body = ""
    if (Test-Path $tempBody) {
      $body = Get-Content $tempBody -Raw -ErrorAction SilentlyContinue
    }
    if (-not $headers) {
      return @{
        Ok = $false
        Status = $null
        BodyText = $body
      }
    }

    $statusLine = ($headers -split "`r?`n" | Where-Object { $_ -match "^HTTP/" } | Select-Object -Last 1)
    $status = $null
    if ($statusLine -match "^HTTP/\S+\s+(\d{3})") {
      $status = [int]$Matches[1]
    }

    return @{
      Ok = $true
      Status = $status
      BodyText = $body
    }
  } finally {
    Remove-Item $tempBody -Force -ErrorAction SilentlyContinue
  }
}

function Invoke-JsonCheck {
  param(
    [string]$Label,
    [string]$Url,
    [int[]]$AcceptStatus = @(200)
  )

  $response = Invoke-CurlRequest -Url $Url
  $status = $response.Status
  if (-not $response.Ok -or $null -eq $status) {
    Write-Host "[FAIL] $Label -> $Url" -ForegroundColor Red
    Write-Host "       Unable to read HTTP response." -ForegroundColor DarkRed
    return @{
      Ok = $false
      Status = $null
      Body = $null
    }
  }

  $body = $null
  $rawBody = $response.BodyText
  try {
    if ($rawBody) {
      $body = $rawBody | ConvertFrom-Json
    }
  } catch {
    $body = $null
  }

  if ($AcceptStatus -contains $status) {
    Write-Host "[PASS] $Label -> $Url ($status)" -ForegroundColor Green
    return @{
      Ok = $true
      Status = $status
      Body = $body
    }
  }

  Write-Host "[FAIL] $Label -> $Url ($status)" -ForegroundColor Red
  return @{
    Ok = $false
    Status = $status
    Body = $body
  }
}

function Invoke-PageCheck {
  param(
    [string]$Label,
    [string]$Url,
    [int[]]$AcceptStatus = @(200),
    [string[]]$ContentHints = @()
  )

  $response = Invoke-CurlRequest -Url $Url
  $status = $response.Status
  if (-not $response.Ok -or $null -eq $status) {
    Write-Host "[FAIL] $Label -> $Url" -ForegroundColor Red
    Write-Host "       Unable to read HTTP response." -ForegroundColor DarkRed
    return $false
  }

  if (-not ($AcceptStatus -contains $status)) {
    Write-Host "[FAIL] $Label -> $Url ($status)" -ForegroundColor Red
    return $false
  }

  $content = $response.BodyText
  if (-not $content) {
    $content = ""
  }

  foreach ($hint in $ContentHints) {
    if ($content -notmatch [regex]::Escape($hint)) {
      Write-Host "[FAIL] $Label -> $Url ($status)" -ForegroundColor Red
      Write-Host "       Missing expected content hint: $hint" -ForegroundColor DarkRed
      return $false
    }
  }

  Write-Host "[PASS] $Label -> $Url ($status)" -ForegroundColor Green
  return $true
}

function Assert-HealthSnapshot {
  param(
    [object]$Result,
    [switch]$AllowDegraded
  )

  if (-not $Result.Ok) {
    return $false
  }

  if (-not $Result.Body) {
    Write-Host "[FAIL] API Health payload missing JSON body" -ForegroundColor Red
    return $false
  }

  $snapshot = $Result.Body
  $expectedIds = @("api", "postgres", "redis", "qdrant", "embedding", "minio")

  if (-not $snapshot.status) {
    Write-Host "[FAIL] API Health payload missing status field" -ForegroundColor Red
    return $false
  }

  if (-not $AllowDegraded -and $snapshot.status -ne "ok") {
    Write-Host "[FAIL] API Health status is $($snapshot.status); expected ok" -ForegroundColor Red
    return $false
  }

  if ($AllowDegraded -and @("ok", "degraded") -notcontains [string]$snapshot.status) {
    Write-Host "[FAIL] API Health status is $($snapshot.status); expected ok/degraded" -ForegroundColor Red
    return $false
  }

  if (-not $snapshot.services) {
    Write-Host "[FAIL] API Health payload missing services[] list" -ForegroundColor Red
    return $false
  }

  $services = @($snapshot.services)
  foreach ($id in $expectedIds) {
    $service = $services | Where-Object { $_.id -eq $id } | Select-Object -First 1
    if (-not $service) {
      Write-Host "[FAIL] API Health services[] missing $id" -ForegroundColor Red
      return $false
    }

    if (-not $AllowDegraded -and $service.status -ne "ok") {
      Write-Host "[FAIL] API Health service $id status is $($service.status); expected ok" -ForegroundColor Red
      return $false
    }
  }

  Write-Host "[PASS] API Health payload structure and service states validated" -ForegroundColor Green
  return $true
}

function Assert-ConsoleMode {
  param([object]$Result)

  if (-not $Result.Ok) {
    return $false
  }

  if (-not $Result.Body) {
    Write-Host "[FAIL] Console mode payload missing JSON body" -ForegroundColor Red
    return $false
  }

  if (-not $Result.Body.mode) {
    Write-Host "[FAIL] Console mode payload missing mode field" -ForegroundColor Red
    return $false
  }

  if (@("preview", "upstream") -notcontains [string]$Result.Body.mode) {
    Write-Host "[FAIL] Console mode '$($Result.Body.mode)' is invalid" -ForegroundColor Red
    return $false
  }

  Write-Host "[PASS] Console mode payload validated ($($Result.Body.mode))" -ForegroundColor Green
  return $true
}

Write-Host ""
Write-Host "Qiyun AI Demo Acceptance" -ForegroundColor Cyan
Write-Host "Console: $ConsoleBaseUrl"
Write-Host "API:     $ApiBaseUrl"
Write-Host ""

$failed = $false

$healthResult = Invoke-JsonCheck -Label "API Health" -Url "$ApiBaseUrl/health" -AcceptStatus @(200, 503)
if (-not (Assert-HealthSnapshot -Result $healthResult -AllowDegraded:$AllowDegradedHealth)) {
  $failed = $true
}

$modeResult = Invoke-JsonCheck -Label "Console Mode" -Url "$ConsoleBaseUrl/api/console/mode" -AcceptStatus @(200)
if (-not (Assert-ConsoleMode -Result $modeResult)) {
  $failed = $true
}

$checks = @(
  @{ Label = "Console Login"; Url = "$ConsoleBaseUrl/login"; AcceptStatus = @(200); ContentHints = @("loginForm") },
  @{ Label = "Console Dashboard"; Url = "$ConsoleBaseUrl/dashboard"; AcceptStatus = @(200, 307, 308); ContentHints = @() },
  @{ Label = "Dashboard API"; Url = "$ConsoleBaseUrl/api/dashboard"; AcceptStatus = @(200, 401); ContentHints = @() },
  @{ Label = "Sites API"; Url = "$ConsoleBaseUrl/api/sites"; AcceptStatus = @(200, 401); ContentHints = @() },
  @{ Label = "System Status Page"; Url = "$ConsoleBaseUrl/dashboard/system-status"; AcceptStatus = @(200, 307, 308); ContentHints = @() }
)

foreach ($check in $checks) {
  $ok = Invoke-PageCheck -Label $check.Label -Url $check.Url -AcceptStatus $check.AcceptStatus -ContentHints $check.ContentHints
  if (-not $ok) {
    $failed = $true
  }
}

Write-Host ""
Write-Host "Recommended Demo Walkthrough" -ForegroundColor Cyan
Write-Host "1. Open $ConsoleBaseUrl/login"
Write-Host "2. Open $ConsoleBaseUrl/dashboard"
Write-Host "3. Verify /dashboard/knowledge-bases preview or upstream data"
Write-Host "4. Verify /dashboard/bots chat preview and recommended questions"
Write-Host "5. Verify /dashboard/leads attachments and follow-up timeline"
Write-Host "6. Verify /dashboard/sites install wizard and widget integration checks"
Write-Host "7. Verify /dashboard/system-status services and health snapshot"
Write-Host ""
Write-Host "Notes" -ForegroundColor Cyan
Write-Host "- Default mode requires /health overall status = ok and all core services = ok."
Write-Host "- Use -AllowDegradedHealth only for local bring-up or partial dependency debugging."
Write-Host ""

if ($failed) {
  Write-Host "Demo acceptance finished with failures." -ForegroundColor Yellow
  exit 1
}

Write-Host "Demo acceptance checks passed." -ForegroundColor Green
