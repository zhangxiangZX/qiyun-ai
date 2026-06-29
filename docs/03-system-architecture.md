# 03 系统架构

## 1. 架构概览
```text
[Web Console / Next.js] ───────┐
[Chat Widget / JS SDK] ────────┼──> [API / NestJS]
                               │        ├─ PostgreSQL（业务数据）
                               │        ├─ Redis（缓存、队列、限流）
                               │        ├─ MinIO/S3（原始文件）
                               │        ├─ Qdrant（向量）
                               │        └─ LLM Provider Adapter
                               │               ├─ OpenAI-compatible
                               │               ├─ DeepSeek-compatible
                               │               └─ Ollama-compatible
                               └──> [Worker / BullMQ]
                                        ├─ 文件解析
                                        ├─ 分块
                                        ├─ Embedding
                                        └─ 向量写入
```

## 2. Monorepo 建议
```text
apps/
  console/       # Next.js 管理后台
  api/           # NestJS API
  worker/        # 队列消费者（可先放在 API）
  widget/        # 可嵌入聊天组件
packages/
  ui/            # 跨应用 UI 基础组件
  config/        # eslint/tsconfig/tailwind 配置
  sdk/           # Widget 与 API 共享类型
infra/
  docker/
docs/
```

## 3. 关键设计决策
1. **多租户隔离优先**：所有业务表均有 `workspace_id`；服务层自动注入 scope，不允许客户端传任意 workspaceId 越权查询。
2. **模型适配器**：禁止业务代码直接调用某个模型 SDK，统一由 `LLMProvider` 接口处理 chat / embeddings。
3. **异步索引**：上传 API 只保存元数据并入队；解析、切分、embedding 在 Worker 执行。
4. **检索增强生成**：检索 topK=6，重排后取 top 3；不足阈值时走“信息不足”策略。
5. **安全默认值**：站点域名白名单、API Key 可轮换、文件私有存储、短期签名 URL。
6. **可替换组件**：S3、Qdrant、LLM 均必须可通过环境变量更换。
7. **工作区上下文显式化**：控制台侧只信任服务端维护的当前工作区，不直接信任客户端传入的 `workspaceId`；切换工作区通过专用接口完成。Widget 与 public API 仅使用 `siteKey + origin` 做入口校验。
8. **容量与扩展前置**：API 保持无状态，Worker 独立扩容；PostgreSQL、Qdrant、MinIO 需支持迁移到托管或集群化部署。上线前必须完成压测并记录活跃会话数、QPS、文档量上限与扩容阈值。

## 4. 聊天请求流程
1. Widget 携带 `botId`、`siteKey`、访客 ID、消息内容调用 API。
2. API 验证站点、来源域名、机器人状态和速率限制。
3. 读取机器人配置与已启用知识库。
4. 对问题 embedding，检索向量库，过滤 workspace/bot/knowledge-base scope。
5. 组装系统提示词、上下文和历史消息。
6. 以 SSE 方式转发模型 token；持久化消息、引用、耗时与 token 用量。
7. 若检索分数不足或模型判定无法回答，返回 `needs_lead_capture=true`。

## 5. 非功能基线
- 可用性：核心服务必须暴露 health/readiness 检查，失败任务要可重试、可追踪。
- 性能：所有面向用户的接口都要记录 P95；控制台常规接口和聊天主链路需要在验收前完成压测。
- 观测性：统一 requestId，慢请求、模型失败、索引失败、队列堆积都要有告警入口。
- 交付策略：先验证单机最小可用，再按 API、Worker、存储分别拆分扩展。
