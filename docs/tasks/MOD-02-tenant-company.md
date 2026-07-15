# MOD-02-tenant-company（企业空间 · 企业资料持久化）

## 用户价值

模块 02「企业空间」在 V1.0 已有 workspaces 实体与基础字段（name/website/plan/contact*），但**企业资料编辑页（company-profile）的"保存"是桩**：只弹"保存功能开发中"，从不调后端；workspaces 表也无扩展字段列。本任务把企业资料真正落库，关闭该 V1.0 缺口。

## 闭环环节

官网后台企业资料页 → 填写/编辑 → PATCH /workspaces/:id 落库（owner/admin 可改）→ 重新进入 GET 回显。

## 不做什么

- 不做企业资料"对外展示页"的前端渲染（仅存数据，展示页属 V2/前端其他任务）。
- 不新增 20 个独立列；扩展字段统一存 `company_profile JSONB`（前向兼容、免迁移膨胀）。
- 不做套餐/计费的写操作（plan 字段仅在资料页展示，本任务不改套餐逻辑）。
- 不重构现有 auth 路由其余端点；仅新增 GET/PATCH /workspaces/:id。
- 不追加 P2：发票资质附件上传（营业执照等文件）保持前端占位，本任务不接对象存储。

## 修改文件

- `migration/030_workspace_company_profile.sql`（新增）
- `apps/api/src/auth/auth.types.ts`（WorkspaceRecord 加 companyProfile；新增 WorkspaceProfilePatch）
- `apps/api/src/auth/auth.postgres-repository.ts`（mapWorkspace 映射 + updateWorkspace 写 company_profile）
- `apps/api/src/auth/auth.service.ts`（getWorkspaceById + updateWorkspace，含 owner/admin 鉴权）
- `apps/api/src/auth/auth.api.ts`（AuthApi 接口 + 实现）
- `apps/api/src/nest/auth/workspace-route.service.ts`（GET / PATCH /workspaces/:id）
- `apps/console/app/api/workspaces/[id]/route.ts`（BFF 代理，新增）
- `apps/console/src/components/team/company-profile-workspace.tsx`（接真接口，去掉桩）

## 验收

- [ ] `pnpm --filter qiyun-api typecheck` 与 `pnpm --filter qiyun-console typecheck` 均 0 错误
- [ ] `pnpm --filter qiyun-api test` 全绿（含新增企业资料读写集成测试），无回归
- [ ] owner/admin 可 PATCH 更新企业资料（基础列 + JSONB 扩展字段）并在 GET 回显；非成员/普通 member 改资料被 401/403 拒
- [ ] 前端 company-profile 页保存后真正落库、重新进入可回显；不再显示"保存功能开发中"桩
- [ ] 迁移 030 需在本机 Docker 起库后执行（沙箱无 PG，列为部署门禁）

## 已知限制

- 仅存结构化字段；附件上传、对外展示页渲染不在本任务。
- JSONB 扩展字段不做服务端 schema 校验（前端字段自由演进），仅做基础类型约束。
