# 当前任务看板

## Doing

- [ ] C-02 文件上传与文档状态机
  - Owner: Codex
  - Branch: feature/C-02-upload
  - Scope: apps/api/**, apps/worker/**, migration/**
  - Blocked by: C-01
  - Goal: 完成文件上传、文档状态流转、队列处理和基础测试

## Review

- [ ] Console MVP UI（合并分支）
  - Owner: Cursor
  - Branch: `feature/console-mvp-ui`
  - Scope: `apps/console/**`, `packages/ui/**`, `TASKS.md`, `COMMAND.md`
  - Includes: P-01 布局 + P-02 看板 + P-03 机器人 + P-04 知识库 + P-05 会话 + P-06 线索 + P-07 站点
  - Result: 控制台 MVP 页面 UI 已完成（mock 数据），待接后端 API

- [ ] P-02 Dashboard 概览页（已并入 console-mvp-ui）
  - Owner: Cursor
  - Branch: feature/P-02-dashboard
  - Scope: apps/console/src/app/dashboard/**, apps/console/src/components/dashboard/**, apps/console/src/lib/dashboard/**
  - Result: KPI、7/30 天趋势图、高频问题、未解决问题、最近线索；顶栏工作区切换与通知；mock 数据，待接 E-06 API

- [ ] P-04 知识库上传页面
  - Owner: Cursor
  - Branch: feature/P-04-knowledge-ui（已推送）；后续打磨在 feature/P-02-dashboard
  - Scope: apps/console/**, packages/ui/**
  - Result: 知识库创建、拖拽/点击上传、文档列表、状态流转模拟、失败重试、移动端适配；待接 C-02 API

- [ ] P-03 机器人列表与编辑
  - Owner: Cursor
  - Branch: feature/P-03-bots-ui
  - Scope: apps/console/src/app/dashboard/bots/**, apps/console/src/components/bots/**, apps/console/src/lib/bots/**
  - Result: 列表、二级导航编辑、五类配置分区、右侧 Chat 预览；mock 数据，待接 API

- [ ] P-05 会话页面
  - Owner: Cursor
  - Branch: feature/P-05-conversations-ui
  - Scope: apps/console/src/app/dashboard/conversations/**, apps/console/src/components/conversations/**, apps/console/src/lib/conversations/**
  - Result: 三栏布局、筛选、消息流与引用、详情侧栏、移动端抽屉；mock 数据，待接 D-05 API

- [ ] P-06 线索页面
  - Owner: Cursor
  - Branch: feature/P-06-leads-ui
  - Scope: apps/console/src/app/dashboard/leads/**, apps/console/src/components/leads/**, apps/console/src/lib/leads/**
  - Result: 线索表格、筛选搜索、状态/负责人/备注更新、CSV 导出、移动端卡片；mock 数据，待接 API

- [ ] P-07 站点与嵌入
  - Owner: Cursor
  - Branch: feature/P-07-sites-ui
  - Scope: apps/console/src/app/dashboard/sites/**, apps/console/src/components/sites/**, apps/console/src/lib/sites/**
  - Result: 域名白名单、嵌入代码复制、站点密钥轮换、测试消息校验；mock 数据，待接 D-02 API

## Done

- [x] P-01 控制台基础布局
  - Owner: Cursor
  - Branch: feature/P-01-console-shell
  - Result: 登录页、侧边栏、顶栏、移动端导航与基础布局骨架

- [x] A-00 仓库与文档包
- [x] A-01 项目初始化
- [x] A-02 工程骨架与模块目录
- [x] A-03 环境变量校验与 `.env.example`
- [x] A-04 ESLint、Prettier、Husky、CI 基础检查
- [x] A-05 设计系统与基础 UI
  - Owner: Codex
  - Branch: feature/A-05-design-system
  - Result: Design Token、Tailwind preset、核心 UI 组件

- [x] G-01 GitHub Project / Issues 任务流模板
  - Owner: Codex
  - Result: Project 脚本、Issue 表单、PR 模板、标签与种子 Issue

## Next（Cursor）

- Cursor 控制台 MVP 页面（P-01 ~ P-07）UI 已全部完成，待分别开 PR 合并。

## 协作规则

- 每个任务只保留一个清晰的 Task ID。
- Cursor 负责前端 UI、Design System、响应式、前端表单和页面体验。
- Codex 负责后端 API、数据库、鉴权、队列、SSE、部署和测试。
- 开始新任务前先建分支，完成后再合并。
- 任务完成后，先更新这里，再更新 `COMMAND.md`。
