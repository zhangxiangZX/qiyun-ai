param(
  [string]$ApiBase = "http://localhost:3001",
  [string]$Email = "owner@qiyun.ai",
  [string]$Password = "Qiyun@2026",
  [string]$WorkspaceId = "ws_67be000a-c633-46cc-a11c-fd4020baa6ed",
  [string]$KnowledgeBaseId = "kb_bcbbafdf-d4e6-43c5-b1c1-47a2d6c6a78d",
  [string]$UploadDir = "E:\qiyun-ai\knowledge-import\kuzimash-v1\upload",
  [int]$BatchSize = 4
)

$ErrorActionPreference = "Stop"

function Get-MimeType([string]$Path) {
  switch ([IO.Path]::GetExtension($Path).ToLowerInvariant()) {
    ".pdf" { return "application/pdf" }
    ".md" { return "text/markdown" }
    ".txt" { return "text/plain" }
    ".docx" { return "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }
    default { return "application/octet-stream" }
  }
}

Write-Host "Logging in as $Email ..."
$loginBody = @{ email = $Email; password = $Password } | ConvertTo-Json -Compress
$login = Invoke-RestMethod -Uri "$ApiBase/auth/login" -Method POST -ContentType "application/json; charset=utf-8" -Body $loginBody
$token = $login.tokens.accessToken
if (-not $token) { throw "Login failed: no access token returned." }

$files = Get-ChildItem -LiteralPath $UploadDir -File | Where-Object { $_.Length -gt 0 } | Sort-Object Name
if ($files.Count -eq 0) { throw "No files found in $UploadDir" }

Write-Host "Uploading $($files.Count) files to KB $KnowledgeBaseId ..."

$uploaded = 0
for ($i = 0; $i -lt $files.Count; $i += $BatchSize) {
  $batch = $files[$i..([Math]::Min($i + $BatchSize - 1, $files.Count - 1))]
  $curlArgs = @(
    "-sS", "-X", "POST",
    "$ApiBase/knowledge-bases/$KnowledgeBaseId/documents",
    "-H", "Authorization: Bearer $token",
    "-H", "x-workspace-id: $WorkspaceId"
  )

  foreach ($file in $batch) {
    $curlArgs += "-F"
    $curlArgs += "files=@$($file.FullName);type=$(Get-MimeType $file.FullName)"
    Write-Host "  + $($file.Name) ($([math]::Round($file.Length / 1MB, 2)) MB)"
  }

  $response = & curl.exe @curlArgs
  if ($LASTEXITCODE -ne 0) { throw "curl failed: $response" }

  try {
    $docs = $response | ConvertFrom-Json
    $uploaded += $docs.Count
    foreach ($doc in $docs) {
      Write-Host "    -> $($doc.id) [$($doc.status)] $($doc.fileName)"
    }
  } catch {
    Write-Host $response
    throw "Unexpected upload response"
  }
}

Write-Host "Done. Uploaded $uploaded document(s). Wait for worker to parse/index."
