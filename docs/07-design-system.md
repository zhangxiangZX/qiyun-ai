# 07 Design System｜控制 UI 质量的硬规则

## 1. 视觉定位
**B2B AI SaaS，克制、可信、现代，不做廉价炫彩后台。**
参考气质：Linear、Vercel、Stripe Dashboard、Notion；禁止直接复制品牌元素。
当前 MVP 不强制暗色模式，但所有 token 结构必须保留 theme switch 的扩展能力。
控制台文案与空状态需预留 i18n key，至少兼容中英文资源结构。

## 2. 设计 Token
### 色彩
- Primary：单一品牌色，通过 CSS variables 定义；不得在业务组件硬编码色值。
- Neutral：使用完整灰阶，正文与背景对比符合 WCAG AA。
- Semantic：success / warning / danger / info 必须语义一致。
- 不超过 1 个品牌主色 + 1 个强调色；禁止彩虹渐变铺满页面。

### 间距与尺寸
- 4px 基础网格；常用 spacing：4/8/12/16/20/24/32/40/48。
- 卡片 padding：16 或 24；页面主间距：24/32。
- 圆角：控件 8，卡片 12，弹窗 16；禁止每个组件自定义圆角。
- 桌面内容最大宽度：1440px；主体左右 padding ≥ 24px。

### 排版
- 中文：系统无衬线优先；英文数字等宽场景可用 monospace。
- 标题层级：H1 28–32、H2 20–24、H3 16–18、正文 14–15。
- 正文行高 1.5–1.7；禁用过密文字墙。
- 每个页面只能有一个 H1。

## 3. 组件规则
必须基于 `shadcn/ui` 二次封装，形成：
`Button, Input, Select, Dialog, Drawer, DropdownMenu, Tabs, Table, Badge, EmptyState, StatCard, PageHeader, ConfirmDialog`。

- Button 只允许：primary / secondary / outline / ghost / destructive / link。
- 所有可点击元素必须有 hover、focus-visible、disabled、loading。
- 表格在移动端不得横向无限溢出，必要时转卡片。
- 图标使用 lucide，不混用多套图标库。
- 图表使用一致的 tooltip、legend、空状态和 loading skeleton。

## 4. 页面质量检查
- [ ] 无任意硬编码颜色、间距、圆角
- [ ] 没有“整页大渐变 + 大标题 + 一堆玻璃卡片”的 AI 模板感
- [ ] 空状态有明确下一步
- [ ] loading 用 skeleton，短操作可用按钮内 spinner
- [ ] 错误信息说明原因与恢复动作
- [ ] 桌面、平板、手机均检查
- [ ] 关键路径可键盘操作
