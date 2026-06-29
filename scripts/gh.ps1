param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$Args
)

$candidates = @(
  (Get-Command gh -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source -ErrorAction SilentlyContinue),
  "$env:LOCALAPPDATA\Microsoft\WinGet\Packages\GitHub.cli_Microsoft.Winget.Source_8wekyb3d8bbwe\bin\gh.exe"
)

$ghExe = $null
foreach ($candidate in $candidates) {
  if (-not $candidate) { continue }
  if (Test-Path -LiteralPath $candidate) {
    $ghExe = $candidate
    break
  }
}

if (-not $ghExe) {
  throw "GitHub CLI not found. Install it with winget or add gh to PATH."
}

& $ghExe @Args
