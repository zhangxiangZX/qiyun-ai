# MOD-08: quick-entry-ai-extract 快捷录入/AI 抽取

## 开工流程

- **Task ID**：MOD-08-quick-entry-ai-extract
- **用户价值/闭环**：审计快捷录入/AI 抽取模块完整性；补齐安全缺口
- **不做什么**：不实现真实 AI 抽取（归 V2 销售域）；不写 Console BFF 路由与前端集成（当前前端纯 mock，归 V2）
- **改哪些文件**：`quick-entry-route.service.ts`（加角色检查）
- **验收**：typecheck 0 错；scoped lint 0 错

## 审计范围

### 后端路由（quick-entry-route.service.ts）

| 路由 | 方法 | 角色保护 | 实现状态 | 结论 |
|------|------|----------|----------|------|
| /quick-entry/ai-extract | POST | ⚠️ 修复前：无 → ✅ 修复后：owner/admin/member | 桩（硬编码空值） | V2 |
| /quick-entry/create-inquiry | POST | ⚠️ 修复前：无 → ✅ 修复后：owner/admin/member | 调用 sales.createInquiry | V2 |

### 后端服务（quick-entry.service.ts）

- `QuickEntryService.aiExtract()`：调用 `sales.analyzeAssistant()` 但忽略分析结果，硬编码 `customerName: ""`、`sourceType: "other"`、`summary: text.slice(0, 200)`、`intentLevel: "medium"`。真实 AI 分析仅存入 `suggestedFields`。
- `QuickEntryService.createInquiryFromAI()`：转发到 `sales.createInquiry()`，无 AI 处理。

### Console 前端

- `quick-entry-workspace.tsx`：纯本地状态表单，"AI 辅助整理"面板显示硬编码 `AI_EXTRACTED`，"最近录入记录"显示硬编码 `RECENT_ENTRIES`。**不调用任何后端 API**。
- `quick-entry-process-workspace.tsx`：显示硬编码 `RAW_TEXT` 和 `AI_FIELDS`。唯一的 API 调用 `apiMutate("/leads/quick-entry/next", "POST")` 路由不存在。

### BFF 路由

**无 Console BFF 路由**。Console 无法代理到后端 quick-entry 端点。

## 审计结论

- **角色保护缺口**：两个 POST 端点无角色检查，viewer 可创建询盘。✅ 已修复：加 `assertWriteRole` 门控（owner/admin/member 才可写）。
- **AI 抽取功能**：后端桩 + 前端 mock，全链路未实现。按 PM 2026-07-08 决策，销售域（含 quick-entry）归 V2。
- **Console 集成缺失**：无 BFF 路由，前端不调 API。归 V2。

## 改动记录

- `apps/api/src/nest/quick-entry/quick-entry-route.service.ts`：导入 `AuthAccessError` + `WorkspaceMemberRole`；新增 `assertWriteRole` 辅助函数；在 `/quick-entry/ai-extract` 和 `/quick-entry/create-inquiry` 路由中调用 `assertWriteRole(ctx.role)`。
