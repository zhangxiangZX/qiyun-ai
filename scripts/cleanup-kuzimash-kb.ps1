param(
  [string]$ApiBase = "http://localhost:3001",
  [string]$Email = "owner@qiyun.ai",
  [string]$Password = "Qiyun@2026",
  [string]$WorkspaceId = "ws_67be000a-c633-46cc-a11c-fd4020baa6ed",
  [string]$KnowledgeBaseId = "kb_bcbbafdf-d4e6-43c5-b1c1-47a2d6c6a78d",
  [string]$BotId = "bot_23870d5a-e503-4ede-9dd2-c19b6f7b4148",
  [string]$PromptPath = "E:\qiyun-ai\knowledge-import\kuzimash-v1\bot-config\系统提示词.md"
)

$ErrorActionPreference = "Stop"

function Invoke-Api {
  param(
    [string]$Method = "GET",
    [string]$Path,
    [object]$Body = $null,
    [hashtable]$Headers
  )
  $params = @{
    Uri = "$ApiBase$Path"
    Method = $Method
    Headers = $Headers
  }
  if ($null -ne $Body) {
    $json = $Body | ConvertTo-Json -Depth 5 -Compress
    $params.ContentType = "application/json; charset=utf-8"
    $params.Body = [System.Text.Encoding]::UTF8.GetBytes($json)
  }
  return Invoke-RestMethod @params
}

Write-Host "Logging in..."
$login = Invoke-Api -Method POST -Path "/auth/login" -Body @{ email = $Email; password = $Password }
$headers = @{
  Authorization = "Bearer $($login.tokens.accessToken)"
  "x-workspace-id" = $WorkspaceId
}

Write-Host "Fetching documents..."
$docs = Invoke-Api -Path "/knowledge-bases/$KnowledgeBaseId/documents" -Headers $headers

$toDelete = New-Object System.Collections.Generic.List[string]

foreach ($group in ($docs | Group-Object fileName)) {
  $sorted = $group.Group | Sort-Object createdAt -Descending
  foreach ($doc in $sorted | Select-Object -Skip 1) {
    [void]$toDelete.Add($doc.id)
    Write-Host ("  duplicate: {0} -> delete {1}" -f $doc.fileName, $doc.id)
  }
}

foreach ($doc in $docs) {
  $name = [string]$doc.fileName
  if ($name -match '06_.*提示词|\.pdf\.txt$') {
    if (-not $toDelete.Contains($doc.id)) {
      [void]$toDelete.Add($doc.id)
      Write-Host ("  exclude: {0} -> delete {1}" -f $name, $doc.id)
    }
  }
}

$toDelete = $toDelete | Select-Object -Unique
Write-Host ("Deleting {0} document(s)..." -f $toDelete.Count)
foreach ($id in $toDelete) {
  Invoke-Api -Method DELETE -Path "/documents/$id" -Headers $headers | Out-Null
  Write-Host ("  deleted {0}" -f $id)
}

Write-Host "Updating bot system prompt..."
$raw = Get-Content -LiteralPath $PromptPath -Raw -Encoding UTF8
$systemPrompt = ($raw -replace '^#\s*库滋玛产品选型助手｜系统提示词\s*\r?\n', '').Trim()

$questions = @(
  [string]"你们主要做什么产品？",
  [string]"户外机柜怎么选？",
  [string]"有操作台和悬臂系统吗？",
  [string]"机柜空调和温控怎么选？"
)

$patched = Invoke-Api -Method PATCH -Path "/bots/$BotId" -Headers $headers -Body @{
  systemPrompt = $systemPrompt
  welcomeMessage = "您好，我是库滋玛产品选型助手。可帮您了解机柜、机箱、操作台、悬臂、温控等产品选型，有什么可以帮您？"
  recommendedQuestions = $questions
}

Write-Host ("Bot updated. Prompt length: {0} chars" -f $patched.systemPrompt.Length)
Write-Host ("Welcome: {0}" -f $patched.welcomeMessage)

$remaining = Invoke-Api -Path "/knowledge-bases/$KnowledgeBaseId/documents" -Headers $headers
Write-Host ("Remaining documents: {0}" -f $remaining.Count)
$remaining | Sort-Object fileName | ForEach-Object {
  Write-Host ("  {0} - {1}" -f $_.status, $_.fileName)
}

Write-Host "Done."
