# Qiyun AI Enterprise Platform（企云 AI）

**仓库名：** `qiyun-ai`

**产品定位：** 企业 AI 智能服务平台

面向 **Codex / Cursor / Claude Code** 等 AI 编程工具协作开发的 MVP 单体仓库。

## 应用模块

| 包名 | 说明 |
|------|------|
| `qiyun-console` | 管理后台（Next.js） |
| `qiyun-api` | 后端 API（NestJS / 服务层） |
| `qiyun-widget` | 官网 AI 聊天挂件 |
| `qiyun-worker` | 文档解析、向量化等异步任务 |
| `qiyun-docs` | 产品与设计文档（`docs/`） |

## 仓库结构

采用 pnpm monorepo，由 Cursor 与 Codex 按模块分工协作：

```text
apps/
  api/          # 后端 API
  console/      # 管理后台
  widget/       # 嵌入挂件
  worker/       # 后台任务
packages/
  ui/           # 共享 UI 组件与设计 token
  config/       # 共享配置与环境变量校验
infra/          # 部署与基础设施
migration/      # 数据库迁移
docs/           # 产品、API、设计、任务文档
```

## MVP 范围

目标：**6–8 周**交付可演示、可私有化部署的 V1。

- 可嵌入官网的 AI 客服
- 企业知识库上传与 RAG 检索
- 访客留资与线索管理
- 控制台会话与基础数据看板
- Agent 能力留到 V1 之后
- Docker Compose 一键部署

## 技术栈

| 层级 | 技术 |
|------|------|
| Web | Next.js 15+、TypeScript、Tailwind CSS、自研 UI（`packages/ui`） |
| API | NestJS（规划中）、PostgreSQL、Redis |
| AI | OpenAI-compatible provider、Qdrant 向量库、S3/MinIO 对象存储 |
| 部署 | Docker Compose、Nginx |

## 快速开始

1. 安装依赖：`pnpm install`
2. 复制环境变量：`cp .env.example .env`
3. 阅读产品文档：`docs/01-product-overview.md`、`docs/02-prd-mvp.md`
4. 阅读设计规范：`docs/07-design-system.md`
5. 查看任务拆分：`docs/10-task-backlog.md`
6. 遵守协作规则：`docs/09-ai-development-rules.md`、`TASKS.md`、`COMMAND.md`

开发控制台：

```bash
pnpm --filter qiyun-console dev
```

> MVP 不做 CRM、在线支付、微信/企微渠道等；复杂计费与多渠道接入放在 V1 之后。

## 相关文档

- [产品说明书](docs/01-product-overview.md)
- [MVP PRD](docs/02-prd-mvp.md)
- [系统架构](docs/03-system-architecture.md)
- [API 契约](docs/05-api-contract.md)
- [页面说明](docs/06-pages.md)
- [设计系统](docs/07-design-system.md)
- [任务看板](TASKS.md)
