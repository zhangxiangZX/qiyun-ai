# Qiyun AI 自动化测试计划

> **用途：** 本地 / CI 统一验收清单。默认跑 **标准层（Layer 0–2）**；真实依赖探测为可选 Layer 3。

---

## 1. 测试分层

| 层级 | 名称 | 命令 | 通过标准 |
|------|------|------|----------|
| **L0** | 静态质量 | `pnpm -r --if-present run lint/typecheck` | 零 error |
| **L1** | 单元 / 路由回归 | `pnpm test`（turbo） | 零 fail |
| **L2** | 构建 | `pnpm build` | 全 workspace 构建成功 |
| **L3** |  live 集成（可选） | `QIYUN_INTEGRATION_TEST=1` + API integration | 探测 Postgres / Redis / Qdrant |

---

## 2. 各包覆盖范围

### `apps/api`（主后端）

| 套件 | 文件 | 说明 |
|------|------|------|
| HTTP 回归 | `app.test.ts` | 鉴权、知识库、Bot、会话、SSE、邀请、DLQ |
| 文档 / 队列 | `document-*.test.ts` | 存储、死信队列 |
| RAG | `rag.*.test.ts` | Provider、对账、降级、索引日志 |
| 健康 | `health.service.test.ts` | B-09 统一探针 |
| Nest 模块 | `nest/**/*.test.ts` | Auth、路由分发、Health、前缀中间件 |
| 集成 | `integration/platform-integration.test.ts` | 多租户 / 空库 / DLQ（live 需 L3） |

**Windows 构建注意：** 若 `apps/api` 内 `tsc` 路径失败，使用根目录：

```powershell
node node_modules/typescript/lib/tsc.js -p apps/api/tsconfig.json
```

### `apps/console`（控制台 BFF + 前端）

| 套件 | 文件 | 说明 |
|------|------|------|
| 工作区解析 | `server/workspace.test.ts` | Header / 默认工作区 |
| 导航鉴权 | `server/auth-navigation.test.ts` | 路由守卫逻辑 |
| 邀请 BFF | `api/auth/.../accept/route.test.ts` | Token 接受代理 |

另需：`pnpm exec next lint`、`tsc --noEmit`、`next build`。

### `apps/worker` / `packages/ui` / `apps/widget`

- Worker / UI：`test` 脚本当前为占位跳过（`--test-skip-pattern=.`）
- Widget：骨架占位，不参与 L1

---

## 3. 一键执行（推荐）

### Windows（PowerShell）

```powershell
# 快速（~15s）：仅 API + Console 单元测试
.\scripts\run-quick-test.ps1

# 完整（~1min）：lint + 编译 + 测试 + Next build
.\scripts\run-full-test.ps1

# 跳过耗时的 production build
.\scripts\run-full-test.ps1 -SkipBuild
```

脚本已设置 `CI=1` / `NEXT_TELEMETRY_DISABLED=1`，避免 Next.js build 在本地卡住。

### 可选：API/Worker ESLint（需根目录 `@eslint/js`）

```powershell
pnpm install
pnpm --filter qiyun-api lint
pnpm --filter qiyun-worker lint
```

### 等价手动步骤

```powershell
pnpm install
pnpm -r --if-present run lint
pnpm -r --if-present run typecheck
node scripts/run-api-tests.mjs
pnpm --filter qiyun-console test
pnpm --filter qiyun-console build
pnpm -r --if-present run build
```

### 可选 Live 集成

```powershell
$env:QIYUN_INTEGRATION_TEST = "1"
node scripts/run-api-tests.mjs
```

需本地 Postgres / Redis / Qdrant 按 `.env.example` 配置。

---

## 4. CI 对齐

GitHub Actions [`.github/workflows/ci.yml`](../.github/workflows/ci.yml)：

```
pnpm install → lint → typecheck → test
```

本地 `run-full-test.ps1` 在 CI 步骤基础上 **追加 console build**，更接近发布前验收。

---

## 5. 失败排查速查

| 现象 | 可能原因 | 处理 |
|------|----------|------|
| API 401 批量失败 | Nest 上下文未 reset | 确认 `await resetNestContextForTests()` |
| `tsc` not found in apps/api | hoisted node_modules | 用根目录 `typescript/lib/tsc.js` |
| Console test 找不到 tsx | 未安装依赖 | `pnpm install` |
| integration 3 skipped | 未开 L3 | 正常；设 `QIYUN_INTEGRATION_TEST=1` 可跑 live |

---

## 6. 发布前 Checklist

- [ ] `.\scripts\run-full-test.ps1` 全绿
- [ ] Console Preview / Upstream 模式横幅正确
- [ ] `GET /health` services 字段完整
- [ ] 知识库 multipart 上传 + SSE 聊天冒烟（手动或 Postman）
