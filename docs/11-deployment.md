# 11 部署说明（MVP）

## 1. 最小环境
- 演示环境：2 vCPU / 4 GB RAM
- 小规模生产：4 vCPU / 8 GB RAM
- 基础依赖：Docker / Docker Compose、PostgreSQL、Redis、MinIO、Qdrant
- 外部能力：可用的 OpenAI-compatible 聊天模型与 embedding 模型
- 域名建议：Console、API、Widget 使用独立域名，并统一接入 HTTPS

## 2. 运行模式

### 2.1 前端预览模式
适合 UI 验收、空态/错误态演示、Cursor 页面开发。

```env
API_RUNTIME_DRIVER=memory
API_SEED_PREVIEW=true
VECTOR_STORE_DRIVER=memory
DOCUMENT_QUEUE_DRIVER=inline
LLM_EMBEDDING_ENABLED=false
```

说明：
- 会话、站点、线索等数据来自内存或 seed snapshot
- 刷新或重启后，运行态数据可能恢复到默认样例
- 适合前端开发，不适合验证持久化与真实检索

### 2.2 本地后端联调模式
适合正式 API 联调、多租户验证、会话持久化验证。

```env
API_RUNTIME_DRIVER=postgres
API_SEED_PREVIEW=false
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/qiyun_ai
REDIS_URL=redis://localhost:6379
MINIO_ENDPOINT=http://localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=qiyun-ai
MINIO_REGION=us-east-1
QDRANT_URL=http://localhost:6333
QDRANT_COLLECTION_NAME=qiyun_chunks
QDRANT_VECTOR_SIZE=1536
DOCUMENT_STORAGE_DRIVER=minio
VECTOR_STORE_DRIVER=qdrant
DOCUMENT_QUEUE_DRIVER=redis
LLM_PROVIDER=openai-compatible
LLM_BASE_URL=https://api.deepseek.com/v1
LLM_API_KEY=replace-me
LLM_CHAT_MODEL=deepseek-chat
LLM_EMBEDDING_BASE_URL=https://api.openai.com/v1
LLM_EMBEDDING_TIMEOUT_MS=10000
LLM_EMBEDDING_ENABLED=true
LLM_EMBEDDING_MODEL=text-embedding-3-small
```

说明：
- 会话、站点、线索、成员、邀请等主业务数据持久化到 PostgreSQL
- 文档原件默认走 MinIO
- Redis 提供限流、队列与后续异步任务基础设施
- Qdrant 提供向量检索

### 2.3 接近生产的联调模式
适合完整验证上传、解析、检索、流式聊天和异步任务。

```env
API_RUNTIME_DRIVER=postgres
API_SEED_PREVIEW=false
VECTOR_STORE_DRIVER=qdrant
DOCUMENT_QUEUE_DRIVER=redis
DOCUMENT_STORAGE_DRIVER=minio
LLM_EMBEDDING_ENABLED=true
```

说明：
- PostgreSQL：主业务数据
- Redis：队列、限流、异步任务
- MinIO：文件原件
- Qdrant：向量检索
- OpenAI-compatible provider：聊天与 embedding

## 3. 推荐环境变量基线

```env
NODE_ENV=production
APP_URL=https://console.qiyuntu.cn
API_BASE_URL=https://api.qiyuntu.cn
NEXT_PUBLIC_API_BASE_URL=https://api.qiyuntu.cn
NEXT_PUBLIC_WIDGET_URL=https://cdn.qiyuntu.cn
API_RUNTIME_DRIVER=postgres
API_SEED_PREVIEW=false

DATABASE_URL=postgresql://user:password@postgres:5432/qiyun_ai
REDIS_URL=redis://redis:6379

MINIO_ENDPOINT=http://minio:9000
MINIO_ACCESS_KEY=change-me
MINIO_SECRET_KEY=change-me
MINIO_BUCKET=qiyun-ai
MINIO_REGION=us-east-1

QDRANT_URL=http://qdrant:6333
QDRANT_COLLECTION_NAME=qiyun_chunks
QDRANT_VECTOR_SIZE=1536

DOCUMENT_STORAGE_DRIVER=minio
VECTOR_STORE_DRIVER=qdrant
DOCUMENT_QUEUE_DRIVER=redis

JWT_SECRET=change-me
JWT_REFRESH_SECRET=change-me-too

LLM_PROVIDER=openai-compatible
LLM_BASE_URL=https://api.deepseek.com/v1
LLM_API_KEY=replace-me
LLM_CHAT_MODEL=deepseek-chat
LLM_EMBEDDING_BASE_URL=https://api.openai.com/v1
LLM_EMBEDDING_TIMEOUT_MS=10000
LLM_EMBEDDING_ENABLED=true
LLM_EMBEDDING_MODEL=text-embedding-3-small

CORS_ORIGIN=https://www.qiyuntu.cn,https://console.qiyuntu.cn,https://go.qiyuntu.cn
COOKIE_SECURE=true
```

域名分离部署详见 [34-qiyuntu-domain-setup.md](./34-qiyuntu-domain-setup.md)。

## 4. 全局限流配置

限流默认已内置，不配置也能工作；生产环境建议显式写入，便于后续调优。

```env
RATE_LIMIT_AUTH_REGISTER_LIMIT=5
RATE_LIMIT_AUTH_REGISTER_WINDOW_MS=60000

RATE_LIMIT_AUTH_LOGIN_LIMIT=10
RATE_LIMIT_AUTH_LOGIN_WINDOW_MS=60000

RATE_LIMIT_AUTH_REFRESH_LIMIT=30
RATE_LIMIT_AUTH_REFRESH_WINDOW_MS=60000

RATE_LIMIT_WORKSPACE_INVITE_LIMIT=20
RATE_LIMIT_WORKSPACE_INVITE_WINDOW_MS=60000

RATE_LIMIT_WORKSPACE_INVITATION_ACCEPT_LIMIT=20
RATE_LIMIT_WORKSPACE_INVITATION_ACCEPT_WINDOW_MS=60000

RATE_LIMIT_WORKSPACE_INVITATION_RESEND_LIMIT=10
RATE_LIMIT_WORKSPACE_INVITATION_RESEND_WINDOW_MS=60000

RATE_LIMIT_SITES_TEST_MESSAGE_LIMIT=20
RATE_LIMIT_SITES_TEST_MESSAGE_WINDOW_MS=60000

RATE_LIMIT_PUBLIC_CHAT_IP_LIMIT=60
RATE_LIMIT_PUBLIC_CHAT_IP_WINDOW_MS=60000

RATE_LIMIT_PUBLIC_LEADS_IP_LIMIT=20
RATE_LIMIT_PUBLIC_LEADS_IP_WINDOW_MS=60000
```

当前限流覆盖范围：
- 注册、登录、刷新令牌
- 工作区邀请、接受邀请、重发邀请
- 站点测试消息
- 公共聊天流
- 公共线索提交

说明：
- 公共聊天除全局 IP 限流外，还支持机器人级 `rateLimitPerMinute` 覆盖
- 返回码统一为 `429 RATE_LIMITED`
- 如果未来接入网关层限流，建议保留应用层限流作为兜底

## 5. 站点 Key 与安全约束

- `site_key` 只在创建或轮换时明文返回一次
- 数据库仅保存 `site_key_hash` 与 `site_key_prefix`
- 控制台列表与详情只展示前缀，不回显旧 key
- 轮换后旧 key 立即失效
- 生产环境应把站点 key 轮换操作纳入审计流程

## 6. 本地最小启动顺序

```powershell
docker compose -f infra/docker-compose.yml up -d postgres redis minio qdrant
docker compose -f infra/docker-compose.yml --profile ops run --rm migrate
docker compose -f infra/docker-compose.yml up -d api worker
```

如只做页面验收，可只启动 Console，并保留 memory 模式。

### 6.1 Docker Hub 拉取超时

若 `docker compose pull` 长时间无进展，参考 `infra/README.md` 的「Docker 镜像加速」章节配置 `registry-mirrors`，或使用 `docker.1ms.run` 前缀拉取后 `docker tag` 对齐官方镜像名。

## 7. 全链路验收清单

### 7.1 基础设施
- [ ] PostgreSQL / Redis / MinIO / Qdrant 已启动并健康
- [ ] `GET /health` 返回 `status: ok`
- [ ] migrate 已执行完成

### 7.2 鉴权与多租户
- [ ] 注册、登录、刷新令牌可用
- [ ] 工作区切换、成员权限、邀请链路可用
- [ ] 非当前工作区资源不能越权访问

### 7.3 知识库与文件链路
- [ ] 文件上传成功
- [ ] 文档状态从 `uploaded` 进入解析/索引完成状态
- [ ] MinIO 中可看到原始文件
- [ ] Qdrant 中可查询到向量数据

### 7.4 RAG 与聊天链路
- [ ] 命中知识库时返回引用
- [ ] 低分未命中时返回诚实拒答或引导留资
- [ ] SSE 聊天流可持续输出
- [ ] 公共聊天命中限流后返回 `429 RATE_LIMITED`

### 7.5 安全与运维
- [ ] CORS 仅放行必要来源
- [ ] 对象存储 bucket 为私有
- [ ] site key 支持轮换，控制台不回显旧 key
- [ ] 登录、公共聊天、上传入口已开启限流
- [ ] 日志、监控、备份策略已启用

## 8. 容量与扩容

- 上线前至少完成一次压测，记录单节点支持的活跃会话数、API QPS、知识库文档量上限、向量规模上限与扩容阈值
- API 进程保持无状态，支持水平扩容
- Worker 独立扩容，优先承接文档解析、向量化、异步重试
- 当知识库规模增长时，优先扩展 Worker、Redis、Qdrant，而不是把所有处理堆在 API 进程

## 9. 备份与恢复

- PostgreSQL：每日全量备份，保留最近 7 天快照和至少 1 份周备份
- MinIO：对象存储做定期同步或存储级快照，确保原始文件可恢复
- Qdrant：升级前执行 snapshot，恢复时与数据库、对象存储保持同一版本窗口
- Redis：如承载关键异步任务，至少保留配置与关键监控告警
- 恢复顺序：基础设施 -> PostgreSQL -> MinIO -> Qdrant -> Redis -> 应用服务
- 每月至少完成 1 次恢复演练，并把结果记录进发布 checklist
