# MOD-05 sales-link-qrcode 获客链接/二维码

> 18 模块主线第 5 站。审计优先，仅补齐真实缺口，不重建。

## 1. 任务用户价值与闭环环节

获客链接/二维码的产品价值闭环：**生成链接 → 投放渠道 → 访客点击跳转 → 统计访问/询盘 → 跟进**。
当前后端 `SalesLinksService` 已具备 `trackVisit`/`trackInquiry`/`getBySlug` 与 `incrementVisits`/`incrementInquiries`，
但这些能力**没有任何路由暴露**。后果：

- 用户生成的获客链接/二维码点击后**无处跳转**（前端 `sales-link-detail-workspace.tsx` 只能硬编码假 URL
  `https://ai.qiyuntech.com/link/123`）；
- `visits/inquiries/conversions` 永远是 0，获客闭环在「投放 → 跳转 → 统计」环节断裂；
- `shortUrl` 字段建库时恒为 `null`，`toListItem` fallback 写成 `/s/:slug`，与任何现有路由都不匹配，前端拿到的短链是死路径。

本任务补齐**公开重定向 + 访问统计端点**，使链接真正可用、可统计，并加固 open-redirect 安全。

## 2. 不做什么

- 不改前端 UI / QR 组件（前端 QR 仍硬编码，后续再绑定 `shortUrl`；属 Cursor 域且非本 Task）；
- 不新增 migration（表 `sales_links` 与 `idx_sales_links_slug_active` 全局唯一索引已齐备，slug 跨租户唯一性已有保障）；
- 不实现 inquiry/conversion 自动归因（需 widget 提交时回传 slug，属更大范围，归 BACKLOG）；
- 不重构 `sales-links` service / repository；
- 不为公开端点加限流（避免统计注水，属增强项，留 follow-up，不在最小缺口内）。

## 3. 修改 / 不会修改的文件清单

修改：
- `apps/api/src/nest/public/public-route.service.ts`
  - 新增 `GET /public/sales-links/:slug`：匿名访问，RLS 旁路（与 selection-pages 同模式）；
  - 解析 slug → 404（不存在 / 未启用，不统计）；
  - 校验 `target_url` 为 http(s) 绝对地址（open-redirect 防护，拦截 `javascript:`/`data:`/协议相对 `//evil`），否则 400（不统计）；
  - 统计访问（`trackVisit`，RLS 旁路）→ `302` 跳转 `Location: target_url`，`cache-control: no-store`；
  - 新增模块级 helper `isSafeHttpUrl`。
- `apps/api/src/sales-links/sales-links.service.ts`
  - `toListItem`：`shortUrl` fallback 改为 `/public/sales-links/${slug}`（与新增端点自洽）；
  - `toListItem`：补 `targetUrl` 输出字段（公开端点需读取目标地址；前端契约向后兼容，运行时多一属性无害）。

新增：
- `apps/api/src/nest/public/public-route.service.test.ts`（PG-free，真实 `SalesLinksService` + `InMemorySalesLinksRepository`）
- `scripts/run-api-tests.mjs`（加入 `dist/nest/public/public-route.service.test.js`）

不会修改：migration、前端组件、widget、selection-pages、sales-links repository/types。

## 4. 验收方式

- `pnpm --filter qiyun-api typecheck` → 0 错 ✅
- 改动文件 scoped eslint → 0 错 ✅
- `node --test dist/nest/public/public-route.service.test.js` → 6/6 通过 ✅
  - active → 302 + `Location` + visits 自增
  - 不存在 slug → 404 且不统计
  - 未启用 → 404 且不统计
  - 缺 target_url → 400 且不统计
  - `javascript:` target → 400（open redirect 防护）且不统计
  - 协议相对 `//evil` target → 400（open redirect 防护）

## 5. 是否超出 P0/P1

否。属 V1.0 获客闭环必要能力（链接必须能跳转 + 统计），是既有半成品的补齐，非新增需求。

## 6. 安全要点

- 公开端点匿名可访问，按 slug 授权，`runWithBypassRls` 旁路 RLS（与 selection-pages 一致）；
- `findBySlug` 全局唯一（migration 024 唯一索引），跨租户 slug 不会串；
- **open-redirect 防护**：仅放行 `http:`/`https:` 绝对地址，阻断 `javascript:`/`data:`/协议相对地址，避免被用作钓鱼跳转。
- 重定向响应 `cache-control: no-store`，避免中间代理缓存跳转。

## 7. 后续（不在本 Task）

- 前端 QR / 短链需绑定后端返回的 `shortUrl`（`/public/sales-links/:slug`）与 `targetUrl`，替换硬编码 URL；
- 公开端点需在网关/ingress 暴露到公开域名（selection-pages 同模式）；
- inquiry/conversion 归因：widget 提交时回传 slug 调用 `trackInquiry`（归 BACKLOG）；
- 可选：公开端点加轻量限流防统计注水。
