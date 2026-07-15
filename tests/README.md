# 企云图 AI V1 上线 Playwright 套件

对应验收剧本中的「页面 / 权限 / 租户 / 异常 / 性能冒烟」自动化。

## 前置

1. Docker 栈已启动：`console:3000` `api:3001`，且 `/api/console/mode` 为 `upstream`
2. 安装依赖：

```bash
cd tests
npm install
npx playwright install chromium
```

## 运行

```bash
cd tests
set PLAYWRIGHT_BASE_URL=http://localhost:3000
set PLAYWRIGHT_API_URL=http://localhost:3001
set E2E_EMAIL=owner@qiyun.ai
set E2E_PASSWORD=****
npm test
```

可选销售越权：

```bash
set E2E_SALES_EMAIL=sales@...
set E2E_SALES_PASSWORD=****
```

## 文件

| 文件 | 覆盖 |
|------|------|
| `login.spec.ts` | 登录成功/失败/空值/协议 |
| `dashboard.spec.ts` | V1 侧栏主页面加载 |
| `inquiry.spec.ts` | 询盘列表/录入/API 创建 |
| `quote.spec.ts` | 报价与模板 |
| `ai.spec.ts` | 助手/知识库/测试/选型 |
| `widget.spec.ts` | Widget/链接/二维码 |
| `permission.spec.ts` | 401、错误 workspace、销售范围 |
| `tenant.spec.ts` | 多工作区隔离 |
| `exceptions.spec.ts` | 鉴权与表单异常 |
| `performance.spec.ts` | 加载时长冒烟（非百万压测） |

## UI 视觉验收（先清单，后 Diff）

功能 E2E 不等于视觉验收。视觉与交互全量规范：

- 规范：`docs/39-v1-ui-visual-test-standard.md`
- 页面清单：`docs/40-v1-ui-page-test-checklist.md`
- Cursor 规则：`.cursor/rules/ui-visual-test.mdc`

顺序：勾选 `docs/40` → 逐页验收 → 再接入 `tests/visual/` Screenshot Diff（目录按需新建）。

## 不做（本目录）

- 百万级数据压测（需独立性能库）
- 完整管理员「开户→知识库→助手→选型→Widget→销售」一键剧本（见 `apps/console/e2e/run-business-flow.mjs` / customer-journey）
- 在未完成 `docs/40` 勾选前做全站盲测截图 Diff
