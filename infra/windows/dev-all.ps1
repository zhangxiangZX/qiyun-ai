# 同时启动 API + Console（两个新窗口）
$Root = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path

Start-Process powershell -ArgumentList @(
  "-NoExit",
  "-ExecutionPolicy", "Bypass",
  "-Command",
  "cd '$Root'; pnpm --filter qiyun-api dev"
)

Start-Sleep -Seconds 2

Start-Process powershell -ArgumentList @(
  "-NoExit",
  "-ExecutionPolicy", "Bypass",
  "-Command",
  "cd '$Root'; pnpm --filter qiyun-console dev"
)

Write-Host "已在两个窗口启动 API 与 Console。"
Write-Host "Console: http://localhost:3000"
Write-Host "Health:  http://localhost:3001/health"
