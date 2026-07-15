$ErrorActionPreference = "Stop"
$RepoRoot = "E:\qiyun-ai"
$EcsHost = "101.201.63.118"
$IdentityFile = "$env:USERPROFILE\.ssh\id_ed25519_qiyun"
$localEnv = Join-Path $RepoRoot ".env"

if (-not (Test-Path $localEnv)) {
  throw "本地缺少 $localEnv"
}

$content = Get-Content $localEnv -Raw
$content = $content -replace '(?m)^APP_URL=.*', "APP_URL=http://${EcsHost}:8080"
$content = $content -replace '(?m)^CORS_ORIGIN=.*', "CORS_ORIGIN=http://${EcsHost}:8080"
$content = $content -replace '(?m)^NEXT_PUBLIC_WIDGET_URL=.*', "NEXT_PUBLIC_WIDGET_URL=http://${EcsHost}"
$content = $content -replace '(?m)^NODE_ENV=.*', "NODE_ENV=production"
$content = $content -replace '(?m)^API_RUNTIME_DRIVER=.*', "API_RUNTIME_DRIVER=postgres"
$content = $content -replace '(?m)^DOCUMENT_QUEUE_DRIVER=.*', "DOCUMENT_QUEUE_DRIVER=redis"
$content = $content -replace '(?m)^VECTOR_STORE_DRIVER=.*', "VECTOR_STORE_DRIVER=qdrant"
$content = $content -replace '(?m)^DATABASE_URL=.*', 'DATABASE_URL=postgresql://postgres:${POSTGRES_PASSWORD}@postgres:5432/qiyun_ai'
$content = $content -replace '(?m)^REDIS_URL=.*', "REDIS_URL=redis://redis:6379"
$content = $content -replace '(?m)^MINIO_ENDPOINT=.*', "MINIO_ENDPOINT=http://minio:9000"
$content = $content -replace '(?m)^QDRANT_URL=.*', "QDRANT_URL=http://qdrant:6333"
if ($content -notmatch '(?m)^POSTGRES_PASSWORD=') {
  $content += "`nPOSTGRES_PASSWORD=postgres`n"
}

$tmp = Join-Path $env:TEMP "qiyun-ecs.env"
Set-Content -Path $tmp -Value $content -Encoding UTF8
scp -i $IdentityFile $tmp "root@${EcsHost}:/opt/qiyun-ai/.env"
Remove-Item $tmp -Force
Write-Host "ENV uploaded to ECS"
