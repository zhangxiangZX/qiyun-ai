# MOD-03 team-role-permission 团队角色权限

> 18 模块主线第 3 站。前序：01-auth-account、02-tenant-company 已完成并验证。
> 本任务采用「先审计、后最小修补」模式：V1.0 角色模型已较完整，只补真实缺口。

## 1. 任务用户价值与闭环环节
- **闭环环节**：销售跟进（团队成员对「跟进任务 / 日历事件」的读写权限）。
- **价值**：保证 viewer（只读访客）无法增删改团队跟进事件，使 RBAC 在全平台保持一致。
  后端已存在 owner/admin/member/viewer 四角色，且 conversations/leads/kb/bot/sales 等写接口均已按角色校验，
  唯独 `/calendar/events` 写接口漏做角色校验，viewer 可越权写团队跟进事件。

## 2. 不做什么
- 不重构角色模型，不改变 owner/admin/member/viewer 语义。
- 不新增/修改 migration（无 schema 变更）。
- 不改前端（前端角色 UI 属 Cursor 域，本轮只修后端越权缺口）。
- 不处理 file-vault / channels 等 V2 模块（属模块 17 / 渠道接入，后续单独审计）。
- 不扩大为「统一角色中间件」重构（超出本任务范围，记入 BACKLOG 观察项）。

## 3. 修改 / 不修改文件清单
**修改**
- `apps/api/src/nest/calendar/calendar-route.service.ts`
  — 新增 `assertWriteRole(role)` 助手（owner/admin/member 放行，其余抛 `AuthAccessError`）；
    在 `POST /calendar/events`、`PATCH /calendar/events/:id`、`DELETE /calendar/events/:id` 三处调用。
- `apps/api/src/nest/calendar/calendar-route.service.test.ts`（新增）
  — viewer 创建/更新/删除 → 抛 `AuthAccessError`；member 创建 → 201。
- `scripts/run-api-tests.mjs` — 登记新测试文件。
- `docs/tasks/MOD-03-team-role-permission.md`（本文件）。

**不修改**：auth.service.ts 角色定义/ Guards、其他 route service、前端、migration。

## 4. 验收方式
- `pnpm --filter qiyun-api typecheck` → 0 错。
- scoped eslint 仅对改动文件 → 0 错。
- `node --test` 运行 `dist/nest/calendar/calendar-route.service.test.js` → 3/3 通过
  （viewer×2 抛错、member×1 创建成功）。
- 集成层（app.test.ts viewer 用例）不受影响（日历无集成用例）。

## 5. 是否超出 P0/P1
否。属 V1.0 权限闭环补齐，无新功能、无 schema 变更、无前端改动。

## 6. 审计结论（为什么只改这一处）
全量扫描 mutating 端点的角色校验：
- chat：conversations/leads PATCH、sites → `assertRoleAllowed`（owner/admin/member 或 owner/admin）✓
- documents：kb/bot 文档类 → `assertManagerRole`（owner/admin）✓
- rag：bot → `assertManagerRole` ✓
- sales：inquiries/quotes → `assertWriteRole`；sources/business-rules → `assertManagerRole` ✓
- sales-links：create/update → write；delete → manager ✓
- selection-pages：→ manager ✓
- workspace-route：member 角色变更/移除、invitations → 委托 authApi（`requireWorkspaceManager`）✓
- **calendar：POST/PATCH/DELETE `/calendar/events` → 无任何角色校验 ✗（已修复）**

根因：日历 route service 未像其他 route 一样引入角色助手，仅依赖全局 guard 的「成员校验」（viewer 也是成员），
因此 viewer 可越权写跟进事件。修复与 chat/sales 保持一致：viewer 拦截，owner/admin/member 放行。

## 7. 紧邻下一步
- **模块 04-dashboard 概览看板**：审计看板聚合接口是否对 viewer 正确只读、数据是否按 workspace 隔离。
