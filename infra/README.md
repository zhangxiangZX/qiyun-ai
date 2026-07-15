# infra

基础设施与部署相关内容。

## 包含内容
- Docker Compose
- ECS 生产编排
- 反向代理配置
- Windows 本地启动脚本

## 本地启动前确认
- Docker Desktop 已启动，Linux Engine 可用
- 根目录 `.env` 已按当前环境更新
- 如果要验证真实 RAG，请不要保留旧的 `VECTOR_STORE_DRIVER=memory` 或 `LLM_EMBEDDING_ENABLED=false`
- 若 `docker pull` 访问 Docker Hub 超时，先配置镜像加速（见下文）

## Docker 镜像加速（国内网络）

首次拉取 `postgres` / `redis` / `minio` / `qdrant` 若长时间卡住，通常是 Docker Hub 网络问题，不是项目代码问题。

### 方式 A：Docker Desktop 配置（推荐）

1. 打开 **Docker Desktop → Settings → Docker Engine**
2. 在 JSON 中加入 `registry-mirrors`，例如：

```json
{
  "registry-mirrors": [
    "https://docker.m.daocloud.io",
    "https://docker.1ms.run"
  ]
}
```

3. 点击 **Apply & Restart**，再执行：

```powershell
docker compose -f infra/docker-compose.yml pull postgres redis minio qdrant
```

### 方式 B：单次拉取使用镜像前缀

```powershell
docker pull docker.1ms.run/library/postgres:16-alpine
docker tag docker.1ms.run/library/postgres:16-alpine postgres:16-alpine

docker pull docker.1ms.run/library/redis:7-alpine
docker tag docker.1ms.run/library/redis:7-alpine redis:7-alpine

docker pull docker.1ms.run/minio/minio:latest
docker tag docker.1ms.run/minio/minio:latest minio/minio:latest

docker pull docker.1ms.run/qdrant/qdrant:latest
docker tag docker.1ms.run/qdrant/qdrant:latest qdrant/qdrant:latest
```

镜像 tag 对齐后，照常执行下方「本地最小启动」即可。

## 本地最小启动

```powershell
docker compose -f infra/docker-compose.yml up -d postgres redis minio qdrant
docker compose -f infra/docker-compose.yml --profile ops run --rm migrate
docker compose -f infra/docker-compose.yml up -d api worker
```

## 推荐本地联调变量

```env
API_RUNTIME_DRIVER=postgres
DOCUMENT_STORAGE_DRIVER=minio
DOCUMENT_QUEUE_DRIVER=redis
VECTOR_STORE_DRIVER=qdrant
QDRANT_VECTOR_SIZE=1536
LLM_PROVIDER=openai-compatible
LLM_BASE_URL=https://api.deepseek.com/v1
LLM_CHAT_MODEL=deepseek-chat
LLM_EMBEDDING_BASE_URL=https://api.openai.com/v1
LLM_EMBEDDING_ENABLED=true
LLM_EMBEDDING_MODEL=text-embedding-3-small
```

## 全链路验收
- 访问 `http://localhost:3001/health`，确认服务状态为 `ok`
- 上传一个测试文档，确认 MinIO 有原件
- 检查 Qdrant collection 已建立并可检索
- 发起公共聊天，确认 SSE 可返回内容
- 连续请求公共聊天或登录接口，确认会返回 `429 RATE_LIMITED`

## ECS 部署

参考 [DEPLOY.md](E:/qiyun-ai/infra/ecs/DEPLOY.md)。

部署前建议：
- 先用 `infra/.env.ecs.example` 更新根目录 `.env`
- 确保 `QDRANT_VECTOR_SIZE` 与 embedding 模型维度一致
- 确保 `site key` 轮换、限流、备份策略都已开启

## 当前约定
- API 健康检查使用 `/health`
- 本地 Compose 默认按 PostgreSQL + Redis + MinIO + Qdrant 全链路运行
- Worker 与 API 都依赖 MinIO / Redis / Qdrant / PostgreSQL 就绪后再启动
