# 11 部署说明（MVP）

## 1. 最小环境
- 2 vCPU / 4 GB RAM（演示）
- 推荐 4 vCPU / 8 GB RAM（小规模生产）
- Docker / Docker Compose
- 域名与 HTTPS
- 可用的模型 API Key 或本地 Ollama

## 2. 环境变量（示例）
```env
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
S3_ENDPOINT=http://minio:9000
S3_BUCKET=enterprise-ai
QDRANT_URL=http://qdrant:6333
JWT_SECRET=change-me
ENCRYPTION_KEY=32-byte-base64-key
LLM_PROVIDER=openai_compatible
LLM_BASE_URL=https://...
LLM_API_KEY=...
EMBEDDING_MODEL=text-embedding-3-small
APP_URL=https://console.example.com
```

## 3. 上线检查
- [ ] 数据库 migration 已执行
- [ ] 对象存储 bucket 私有
- [ ] 管理后台、API、Widget 使用独立域名
- [ ] CORS 仅允许必要域名
- [ ] 日志与备份策略已启用
- [ ] API Key 可轮换
- [ ] 上传文件限制和限流已启用
- [ ] robots / sitemap / 基础隐私政策已配置

## 4. 容量与扩展
- 上线前必须完成一次压测，记录单节点可支撑的活跃会话数、API QPS、知识库文档量上限与扩容阈值。
- API 保持无状态，支持水平扩容；Worker 独立扩容；数据库、对象存储和向量库可逐步替换为托管或集群化部署。
- 知识库规模增长后，应优先扩展解析与索引 Worker，而不是把所有处理都放在 API 进程里。

## 5. 备份与恢复
- PostgreSQL：每日全量备份，保留最近 7 天快照和 1 份周备份；恢复前先校验备份可读性。
- MinIO：对象存储桶使用定期同步或存储级快照，确保原始文件可恢复。
- Qdrant：升级前做 snapshot，恢复时与数据库和对象存储保持同一版本窗口。
- 恢复顺序：基础设施 -> PostgreSQL -> MinIO -> Qdrant -> 应用服务。
- 每月至少做 1 次恢复演练，并把结果记录到发布 checklist。