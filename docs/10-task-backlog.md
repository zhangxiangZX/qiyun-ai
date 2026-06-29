# 10 开发任务拆分（MVP Backlog）

> 任务大小控制在 0.5–1.5 天；每个任务均可独立交给 Codex/Cursor。

## Epic A：工程与基础设施
- [ ] A-01 初始化 pnpm monorepo、apps/packages 目录与共享 tsconfig
- [ ] A-02 Docker Compose：PostgreSQL、Redis、MinIO、Qdrant
- [ ] A-03 环境变量校验与 `.env.example`
- [ ] A-04 ESLint、Prettier、Husky、CI 基础检查
- [ ] A-05 设计 token、Tailwind theme、基础 UI 组件

## Epic B：身份与工作区
- [ ] B-01 用户注册、登录、JWT refresh 策略
- [ ] B-02 工作区创建与当前工作区切换
- [ ] B-03 成员邀请、角色权限 guard
- [ ] B-04 workspace scoped repository / query helper
- [ ] B-05 审计日志基础设施
- [ ] B-06 当前工作区上下文与激活接口

## Epic C：知识库
- [ ] C-01 知识库 CRUD
- [ ] C-02 私有文件上传与类型/大小校验
- [ ] C-03 文档状态机与队列任务
- [ ] C-04 PDF/DOCX/TXT/MD 文本提取适配器
- [ ] C-05 文本切块策略与 chunk 元数据
- [ ] C-06 embedding provider adapter
- [ ] C-07 Qdrant collection / payload 多租户过滤
- [ ] C-08 文档重试、删除、重建索引
- [ ] C-09 知识库 UI 和文件状态展示
- [ ] C-10 机器人与知识库关联表与多选配置

## Epic D：机器人与聊天
- [ ] D-01 机器人 CRUD、系统提示词与知识库关联
- [ ] D-02 站点与域名白名单、siteKey
- [ ] D-03 RAG 检索服务与阈值策略
- [ ] D-04 LLM chat provider adapter（SSE）
- [ ] D-05 会话、消息、引用持久化
- [ ] D-06 Public chat stream API 与速率限制
- [ ] D-07 Widget 初始化、样式隔离、会话恢复
- [ ] D-08 Widget 流式消息、来源、失败重试
- [ ] D-09 机器人编辑页 + 实时预览
- [ ] D-10 嵌入代码页面与测试工具
- [ ] D-11 Widget SDK 版本参数与向后兼容初始化

## Epic E：线索与分析
- [ ] E-01 留资表单配置
- [ ] E-02 Public leads API、字段验证、反垃圾限制
- [ ] E-03 线索列表、详情、状态、备注
- [ ] E-04 CSV 导出
- [ ] E-05 analytics 聚合查询
- [ ] E-06 Dashboard KPI、趋势、未解决问题

## Epic F：交付
- [ ] F-01 健康检查与 readiness
- [ ] F-02 生产 Dockerfile / Nginx / HTTPS 文档
- [ ] F-03 备份与恢复说明（PostgreSQL、MinIO、Qdrant）
- [ ] F-04 演示数据 seed（默认工作区、机器人、知识库、示例 PDF、模拟会话与线索）
- [ ] F-05 端到端验收脚本与发布 checklist
