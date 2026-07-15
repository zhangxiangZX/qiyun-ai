# 企云AI V2 — Design System

> Extracted from design-crops PNGs and original package CSS.
> This is the single source of truth for all visual decisions.

## Brand

| Token | Value |
|-------|-------|
| Name | 企云AI / Qiyun AI |
| Logo icon | Blue cloud with lightning bolt |
| Logo colors | #3f68fc → #6aa4f9 → #77c8fb gradient |
| Logo background | #f8f9fc (light) or transparent |

## Color Palette

### Core
| Token | Hex | Usage |
|-------|-----|-------|
| `--primary` | #3f5eff | Primary actions, links, active states |
| `--primary-dark` | #2563eb | Button hover, pressed |
| `--primary-light` | #eff3ff | Tags, badges, hover backgrounds |
| `--blue` | #3068ff | Alternate blue accent |

### Surface
| Token | Hex | Usage |
|-------|-----|-------|
| `--bg` | #f6f8fc | Page background |
| `--card` | #ffffff | Card, panel backgrounds |
| `--nav` | #06152f | Sidebar background base |
| `--nav2` | #0b234a | Sidebar background accent |
| `--topbar` | #ffffff | Top bar background |

### Text
| Token | Hex | Usage |
|-------|-----|-------|
| `--text` | #172b4d | Primary text (headings, body) |
| `--text-secondary` | #5a6a85 | Secondary text (descriptions) |
| `--muted` | #8190a8 | Muted, placeholder, disabled |

### Border
| Token | Hex |
|-------|-----|
| `--line` | #e9eef7 |

### Semantic
| Token | Hex | Light variant |
|-------|-----|--------------|
| `--green` | #22b36b | `--green-light`: #e9faef |
| `--orange` | #ff9c27 | `--orange-light`: #fff6df |
| `--red` | #ff5b5b | `--red-light`: #fff0ee |
| `--purple` | #7856f5 | `--purple-light`: #f0ecff |
| `--cyan` | #22d3ee | `--cyan-light`: #ecfdff |

## Typography

| Level | Size | Weight | Usage |
|-------|------|--------|-------|
| Display | 26px | 700 | KPI numbers |
| H1 | 22px | 700 | Page title |
| H2 | 20px | 700 | Topbar title |
| H3 | 17px | 700 | Modal title |
| Body | 14px | 400 | Default body |
| Small | 13px | 500 | Secondary, descriptions |
| Caption | 12px | 500 | Table headers, tags |
| Micro | 11px | 500-600 | Badges, labels |

**Font stack**: Inter, "PingFang SC", "Microsoft YaHei", "Noto Sans SC", Arial, sans-serif

## Spacing Scale

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Tight gaps |
| sm | 8px | Element gaps |
| md | 12px | Button padding |
| base | 16px | Grid gaps, card padding |
| lg | 20-24px | Section margins |
| xl | 28px | Topbar padding |
| 2xl | 40px | Content bottom |

## Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | 6px | Small buttons, tags |
| `--radius` | 10px | Cards, panels, nav items |
| `--radius-lg` | 12px | Modals, dropdowns |
| `--radius-xl` | 16px | Large cards |

## Shadows

| Token | Value |
|-------|-------|
| `--shadow-sm` | 0 1px 2px rgba(23,43,77,0.04) |
| `--shadow` | 0 4px 18px rgba(20,50,100,0.035) |
| `--shadow-md` | 0 8px 30px rgba(23,43,77,0.08) |

## Sidebar

| Property | Value |
|----------|-------|
| Width | 216px |
| Background | linear-gradient(180deg, #0a1a38 0%, #06142d 100%) |
| Padding | 20px 14px |
| Nav gap | 6px |
| Nav item padding | 13px 12px |
| Nav item radius | 9px |
| Nav active gradient | linear-gradient(90deg, #3c67f9, #5456f6) |

## Topbar

| Property | Value |
|----------|-------|
| Height | 72px |
| Background | #fff |
| Border-bottom | 1px solid #e9eef7 |
| Horizontal padding | 28px |

## Content Layout

| Property | Value |
|----------|-------|
| Padding | 18px 20px 34px |
| Max-width | 1500px |
| KPI gap | 14px |
| Grid gap | 14px |

## Grid Ratios

| Layout | Columns |
|--------|---------|
| grid2 | 1.55fr 0.8fr (main + sidebar) |
| grid3 | 1.2fr 1.2fr 0.85fr (chart + chart + sidebar) |
| KPI row | repeat(5, minmax(0, 1fr)) |
| cards4 | repeat(4, 1fr) |

## Gradients (Brand-defined)

| Element | Gradient |
|---------|----------|
| Sidebar | linear-gradient(180deg, #0a1a38, #06142d) |
| Nav active | linear-gradient(90deg, #3c67f9, #5456f6) |
| Plan card | linear-gradient(145deg, #243d94, #1b2968) |
| Plan button | linear-gradient(90deg, #526cff, #7457ff) |
| Primary button | linear-gradient(90deg, #4264f4, #635af5) |
| Funnel | linear-gradient(90deg, #355cf5, #7e8eff) |
| Bar chart | linear-gradient(180deg, #5c84ff, #3f5eff) |
| Brand logo icon | linear-gradient(135deg, #5c84ff, #36b9ff) |
| User avatar | linear-gradient(135deg, #f6ddc7, #f0c9a8) |

## States

| State | Indicator |
|-------|-----------|
| High intent (高意向) | `tag.hot`: bg #fff0ee, text #ff695d |
| Medium intent (中意向) | `tag.mid`: bg #fff6df, text #ec9700 |
| Low intent (低意向) | `tag.low`: bg #e9faef, text #13a65c |
| Normal / Active | `tag.blue`: bg #eff3ff, text #3f5eff |
| Pending activation | `tag.orange` variant |

## Chart Colors

| Series | Color |
|--------|-------|
| 询盘数 | #3f5eff (primary blue) |
| 高意向客户 | #4bcf8a (green) |
| 待报价 | #ffae28 (orange) |
| 成交数 | #7856f5 (purple) |

## Donut Segments

| Segment | Color | Pct |
|---------|-------|-----|
| 官网 | #4563f7 | 42% |
| 销售链接 | #4ac986 | 23% |
| 抖音 | #ffad2e | 16% |
| 展会二维码 | #a5b3cc | 9% |
| 其他 | #e2e8f0 | 10% |

## Pages

1. **工作台** (Dashboard) — `index.html`
2. **智能助手** (Sales Assistant) — `assistant.html`
3. **询盘与报价** (Inquiry & Quote) — `inquiries.html`, `inquiry-detail.html`, `quotes.html`, `quote-detail.html`
4. **客户与运营** (Customers) — `customers.html`
5. **渠道与站点** (Channels) — `channels.html`
6. **数据中心** (Analytics) — `analytics.html`
7. **系统设置** (Settings) — `settings.html`
8. **团队成员** (Team) — `team.html`
9. **移动端预览** (Mobile Preview) — `mobile-preview.html`

## Z-Index Scale

| Layer | Var | Value | Usage |
|-------|-----|-------|-------|
| Dropdown | `--z-dropdown` | 100 | Dropdown menus |
| Sticky | `--z-sticky` | 200 | Sticky headers, sidebar |
| Overlay | `--z-overlay` | 300 | Mobile sidebar overlay |
| Modal | `--z-modal` | 400 | Modal dialogs |
| Toast | `--z-toast` | 500 | Toast notifications |
| Tooltip | `--z-tooltip` | 600 | Tooltips |

## Mobile Menu

| Property | Value |
|----------|-------|
| Breakpoint | ≤820px shows hamburger button |
| Sidebar width | 260px (full overlay at ≤640px) |
| Backdrop | rgba(0,0,0,0.35) |
| Close | Click outside, Escape key, or hamburger button |

## JavaScript API

### window.Qiyun
| Method | Description |
|--------|-------------|
| `toast(msg, type, duration)` | Show toast notification |
| `modal(id, title, content, buttons)` | Create modal dialog |
| `confirm(title, message)` | Promise-based confirm dialog |
| `closeModal(overlay)` | Close a modal |
| `validate(field)` | Validate a form field |
| `animateNumbers()` | Animate KPI numbers with [data-count] |

### Keyboard Shortcuts
| Keys | Action |
|------|--------|
| Escape | Close modal or mobile menu |
| Ctrl/Cmd + K | Focus search input |

## Breakpoints

| Width | Behavior |
|-------|----------|
| ≤1280px | KPIs 3-col, grid3 2-col |
| ≤1100px | grid2/grid3 single column |
| ≤920px | Reduced padding |
| ≤820px | Collapsed sidebar (icon only) |
| ≤640px | Full mobile, hidden sidebar |
