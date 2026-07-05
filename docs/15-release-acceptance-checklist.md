# Qiyun AI Release Acceptance Checklist

> 适用场景：本地验收、提测前检查、合并前回归、上线前冒烟。

## 1. 环境准备

- [ ] 已切到目标分支，并确认工作区无意外文件
- [ ] `.env` 已按 [docs/11-deployment.md](E:/qiyun-ai/docs/11-deployment.md) 配置完成
- [ ] Docker Desktop / Docker Engine 可正常启动
- [ ] `pnpm install` 已完成
- [ ] PostgreSQL / Redis / Qdrant / MinIO 可用

## 2. 自动化验收

### 标准验收

- [ ] 运行 `./scripts/run-full-test.ps1`
- [ ] `console lint` 通过
- [ ] `api compile` 通过
- [ ] `worker compile` 通过
- [ ] `api test` 通过
- [ ] `console test` 通过
- [ ] `console build` 通过

### 快速回归

- [ ] 运行 `./scripts/run-quick-test.ps1`
- [ ] 结果可复现，不存在偶发失败

## 3. 本地部署验收

- [ ] 运行本地 Docker Compose
- [ ] API 容器启动成功
- [ ] Worker 容器启动成功
- [ ] PostgreSQL 健康
- [ ] Redis 健康
- [ ] Qdrant 健康
- [ ] MinIO 健康
- [ ] `GET /health` 返回 `200`
- [ ] `health.services` 字段完整

## 4. 后端主链路冒烟

### 鉴权与工作区

- [ ] 注册账号成功
- [ ] 登录成功
- [ ] 返回 access token / refresh token
- [ ] 当前工作区接口正常
- [ ] `x-workspace-id` 越权访问会被拒绝

### 机器人与站点

- [ ] 创建机器人成功
- [ ] 查询机器人详情成功
- [ ] 更新机器人配置成功
- [ ] 创建站点成功
- [ ] 域名白名单更新成功
- [ ] 轮换 site key 成功
- [ ] 旧 site key 返回 `403`
- [ ] 新 site key 可正常使用

### 知识库与文档

- [ ] 创建知识库成功
- [ ] 上传文档成功
- [ ] 文档状态能经过 `uploaded -> parsing -> indexing -> ready`
- [ ] 失败文档能记录错误信息
- [ ] Worker 能消费解析任务

### RAG 与聊天

- [ ] Embedding 正常生成
- [ ] Qdrant 检索正常返回结果
- [ ] 低分命中会进入未命中策略
- [ ] SSE 流包含 `retrieval` / `token` / `citations` / `done`
- [ ] 引用信息可返回文档来源

### 会话与线索

- [ ] 会话列表可读
- [ ] 会话详情可读
- [ ] 会话 PATCH 正常
- [ ] Leads 列表可读
- [ ] Lead 详情可读
- [ ] Lead PATCH 正常

### 分析与报表

- [ ] Dashboard 聚合接口正常
- [ ] Reports 聚合接口正常
- [ ] 空数据时返回结构仍稳定

## 5. 控制台验收

### 基础体验

- [ ] 登录页展示正常
- [ ] 控制台 Layout 正常
- [ ] 桌面端体验正常
- [ ] 移动端体验正常
- [ ] 空态、加载态、错误态、成功态完整

### 业务页

- [ ] Dashboard 页面正常
- [ ] Knowledge Bases 页面正常
- [ ] Bots 页面正常
- [ ] Conversations 页面正常
- [ ] Leads 页面正常
- [ ] Sites 页面正常
- [ ] Team / Invitations 页面正常
- [ ] Reports 页面正常
- [ ] System Status 页面正常

### 模式一致性

- [ ] Preview 模式文案诚实
- [ ] Upstream 模式文案诚实
- [ ] 没有把 mock 状态伪装成真实写入

## 6. 安全与边界

- [ ] site key 只在创建或轮换时明文返回一次
- [ ] 数据按 `workspace_id` 隔离
- [ ] 公开接口限流生效
- [ ] 登录接口限流生效
- [ ] 软删除实体的唯一约束行为符合预期

## 7. 发布前人工确认

- [ ] 当前分支变更范围清晰
- [ ] 已按 [docs/16-commit-plan.md](E:/qiyun-ai/docs/16-commit-plan.md) 拆分提交
- [ ] 不包含临时调试日志
- [ ] 不包含本地私密配置
- [ ] 不包含无用测试数据
- [ ] README / 部署文档已同步

## 8. 建议验收结论模板

### 可合并

- 自动化通过
- 本地部署通过
- 主链路冒烟通过
- 无阻塞级问题

### 需返工

- 存在阻塞级接口错误
- 自动化不稳定
- 部署链路未跑通
- Preview / Upstream 模式表达不一致
