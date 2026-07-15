# 09 AI 开发规则（复制到 Cursor/Codex）

> **优先遵守**：[AI云_项目核心需求护栏与开发防跑偏规则_V1.0.md](./AI云_项目核心需求护栏与开发防跑偏规则_V1.0.md)（高于本文档）

## 不可违反
1. 先读相关 docs，再写代码；需求不明确时采用最小可逆实现并写 TODO。
2. 不得越过多租户隔离。任何查询必须由服务端从认证上下文获取 workspaceId。
3. 不得在前端暴露模型 API Key、数据库凭据、对象存储凭据。
4. 不得以 `any`、忽略 TypeScript 错误、关闭 ESLint 来“完成任务”。
5. 不得使用 mock 数据替代已经定义的真实 API，除非页面骨架任务明确允许。
6. 不得硬编码颜色、间距、圆角、权限或业务状态。
7. 不得在未确认的情况下新增依赖；优先复用现有依赖与组件。
8. 所有 mutation 必须有 loading、错误反馈、成功反馈和失焦/重复点击保护。
9. 所有删除操作必须二次确认。
10. 每个任务完成后更新 Task 状态与验证结果。

## 工程标准
- TypeScript strict
- 前端：React Server Components 优先；客户端组件仅用于交互
- API：DTO 校验、统一错误码、OpenAPI 注释
- 数据库：migration 可重复执行；必要索引；禁止 N+1 查询
- 测试：单元测试默认用 Jest；前端交互用 React Testing Library；API 集成测试用 supertest；E2E 用 Playwright。核心权限、域名校验、知识库状态机、聊天流事件、工作区切换、站点密钥轮换至少有单测；关键模块覆盖率目标 ≥ 70%。
- 运维：审计日志默认保留 90 天，按需归档或清理。
- 日志：错误必须带 requestId，不记录密码、token、原始 API Key

## 每次提交前自检
```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Definition of Done
- [ ] 满足对应 PRD 验收项
- [ ] UI 符合 Design System
- [ ] 权限/租户隔离已验证
- [ ] 空、加载、错误状态齐全
- [ ] lint/typecheck/test/build 通过
- [ ] 文档或 API 契约同步更新
