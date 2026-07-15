# MOD-06 · selection-page 选型页

> AGENTS.md 开工流程

## 1. Task ID
MOD-06-selection-page

## 2. 用户价值 / 闭环
选型页（selection pages）是获客漏斗的关键一环——访客在公开选型页填写需求并提交。
本次补齐 **Postgres 持久化仓库**，让选型页配置和提交记录落库不丢失，与 sales-links / calendar 等模块同级可上线。

## 3. 不做什么
- 不改 Console BFF 公开页（`ai-selection-page-store.ts` 是 Next.js SSR 渲染层，数据模型不同，归单独 PR）
- 不改数据模型（`SelectionPageRecord` / `SelectionSubmissionRecord` 不变）
- 不新增 migration（025 已齐备：`selection_pages` + `selection_submissions` + 索引）

## 4. 改哪些文件
| 文件 | 改动 |
|------|------|
| `apps/api/src/selection-pages/selection-pages.postgres-repository.ts` | **新建** — PG 仓库实现 |
| `apps/api/src/runtime.ts` | 加 `PostgresSelectionPagesRepository` import + `driver === "postgres"` 分支 |
| `apps/api/src/selection-pages/selection-pages.service.test.ts` | **新建** — 14 个 PG-free 单测 |
| `scripts/run-api-tests.mjs` | 加 `selection-pages.service.test.js` |

## 5. 验收
- `pnpm --filter qiyun-api typecheck` → 0 错 ✅
- scoped eslint → 0 错 ✅
- `node --test selection-pages.service.test.js` → 14/14 通过 ✅

## 审计摘要
- `runtime.ts` 第 512 行硬编码 `new InMemorySelectionPagesRepository()`，从不切到 PG
- 同工程其他模块（sales-links/channels/chat）全部有 PG/InMemory 分支
- Migration 025 已建好表和索引，缺的只是仓库实现
- 其余环节自检：路由层角色守卫 ✅、公开端点 ✅、slug 唯一性 ✅、租户隔离 ✅

## Postgres 仓库实现要点
- 接口完全遵循 `SelectionPagesRepository`：`list` / `findById` / `findBySlug` / `upsert` / `delete` / `createSubmission` / `listSubmissions`
- 所有查询过滤 `workspace_id` + `deleted_at is null`（租户隔离 + 软删除）
- `config` 和 `answers` JSONB 字段使用 `JSON.stringify()` 序列化写入，pg 驱动自动解析回 Object 读
- `upsert` 用 `INSERT ... ON CONFLICT (id) DO UPDATE`（与 service 层 upsert 语义一致）
- `delete` 用 `UPDATE ... SET deleted_at = now()` 软删除
- `listSubmissions` 按 `selection_page_id` 过滤（调用方已通过 `getById` 验证 workspace 所有权）
