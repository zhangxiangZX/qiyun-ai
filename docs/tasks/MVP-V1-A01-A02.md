# MVP-V1-A01-A02

## 用户价值

平台管理员可登录独立开通后台，创建客户工作区并邀请企业管理员，关闭自助注册后的正式开通路径。

## 闭环环节

平台开通 → 邀请激活 → 客户登录后台

## 不做什么

- 不做完整 A-06 四角色矩阵（仍用 owner/admin/member）
- 不做试用申请 API 入库（仍本地表单）
- 不做平台侧会话/线索查看

## 验收

- [x] `PLATFORM_ADMIN_*` 账号可登录并进入 `/platform/workspaces`
- [x] 普通客户无法访问 `/platform`（重定向至 `/dashboard`）
- [x] 平台管理员可创建「库滋玛演示工作区」并发出管理员邀请
- [x] API 测试覆盖 provision 流程

## 实现摘要

- API：`GET/POST /platform/workspaces`，`users.platform_role`，工作区扩展字段
- Console：`/platform/login`、`/platform/workspaces` 开通后台 + BFF 代理
- 测试账号（`NODE_ENV=test`）：`platform@qiyun.test` / `platform-secret123`
