# 页面字体/间距/颜色统一改造

## 问题
控制台各页面（尤其是 `home-overview`、`dashboard-overview`、`boss-dashboard`、`inquiry-center` 等高频页）字号、间距、颜色不统一：每个 CSS Module 都硬编码自己的 hex 颜色、`font-size`、`padding`、`gap`，导致 40+ 页面看起来各成一派。

## 设计系统级解决方案
没有逐个页面拍脑袋改数字，而是先建立「单一真相源」的设计 token，再通过共享基础类和批量 token 替换实现统一。

### 1. 新增设计 token（单一真相源）
`packages/ui/src/globals.css`：
- 字号阶梯：`--fs-display / --fs-h1 / --fs-h2 / --fs-h3 / --fs-body / --fs-sm / --fs-xs / --fs-caption`
- 间距阶梯：`--sp-1 ... --sp-8`（4px 栅格）
- 卡片 token：`--card-pad / --card-pad-sm / --card-radius / --card-border / --card-shadow / --card-bg`

`packages/ui/tailwind.preset.ts`：
- 同步 `fontSize` 语义工具类：`text-display`、`text-h1`、`text-h2`、`text-h3`、`text-body`、`text-sm` 等，让工具类与模块 CSS 用同一把尺。

### 2. 新增共享页面基础类
`apps/console/src/styles/console.css`：
- `.page-shell`：统一页面外框 padding、max-width、居中
- `.page-head` / `.page-head__title` / `.page-head__subtitle`：统一页标题/副标题
- `.card-head`：统一卡片标题行（字号、padding、边框）
- `.kpi-row` / `.kpi-tile`：统一 KPI 网格与卡片

后续新增页面应直接复用这些类，而不是再写一份 `.cardHeader` / `.kpiCard`。

### 3. 全站颜色归一
工具脚本 `normalize-colors.cjs` 对 `apps/console/src/styles/*.module.css` 全部 46 个模块执行保守替换：
- 重复出现的深色文字（`#172b4d`、`#1e293b`、`#102044` 等）→ `var(--foreground)`
- 重复出现的次要文字（`#8190a8`、`#64748b`、`#70809a` 等）→ `var(--muted-foreground)`
- 重复出现的边框线（`#e9eef7`、`#edf1f7`、`#eef2f7` 等）→ `var(--border)`
- 重复出现的主蓝（`#3f5eff`、`#3b5eff` 等）→ `var(--primary)`

图表分段色、状态色、白字等敏感颜色不在映射范围内，未误改。

### 4. 看板样板页完全重构
`home-overview.module.css` 与 `dashboard-overview.module.css` 的卡片、标题、KPI、间距全部改用 token：
- `.heroTitle` / `.pageTitle h1` → `var(--fs-h1)`
- `.cardHeader` / `.cardHeader h2` → `var(--fs-h3)` + `var(--card-pad-sm)` / `var(--card-pad)`
- `.kpiCard` / `.card` → `var(--radius-card)` / `var(--card-pad)` / `var(--shadow-card)`
- `.kpiGrid` / `.midGrid` / `.bottomGrid` → `var(--sp-4)`
- 页面内容区 → `var(--page-max-width)` + `var(--page-padding)`

### 5. 高频页结构对齐
`boss-dashboard.module.css`：移除自定义 `#f8faff` 背景，改为透明以复用全局画布；统一外 padding。

`inquiry-center.module.css`：页标题、副标题、KPI 卡片、页面间距全部改用 token。

## 验证
- `pnpm exec tsc --noEmit`：通过（EXIT=0）
- Playwright 截图核对：`/dashboard`、`/dashboard/boss`、`/dashboard/inquiries` 三页均正常渲染，无样式断裂
- 程序化读取卡片边框颜色：已落到 `rgb(226,232,240)` / `rgb(227,233,243)`，即 `--border` 的渲染值

## 截图
- `E:/qiyun-ai/.workbuddy/shots/consistency_dashboard.png`
- `E:/qiyun-ai/.workbuddy/shots/consistency_boss.png`
- `E:/qiyun-ai/.workbuddy/shots/consistency_inquiries.png`

## 后续建议
剩余页面（knowledge-base、leads、follow-up-tasks、quotes 等）已统一颜色，但卡片头部、标题字号等结构仍用各自 class 定义。下一步可用同样思路把它们逐一切到 `.card-head` / `.page-head` / `.kpi-tile` 等共享类，实现彻底统一。由于 token 系统已就位，这部分只需改 className/删除重复定义即可，是机械工作。
