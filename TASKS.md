# 当前任务看板

## Doing

- [ ] P-04 知识库上传页面
  - Owner: Cursor
  - Branch: feature/P-04-knowledge-ui
  - Scope: apps/console/**, packages/ui/**
  - Depends on: C-02 API contract
  - Goal: 完成知识库创建、文件上传、状态列表、失败重试和移动端适配

- [ ] P-02 Dashboard 概览页
  - Owner: Cursor
  - Branch: feature/P-04-knowledge-ui
  - Scope: apps/console/src/app/dashboard/**, apps/console/src/components/dashboard/**, apps/console/src/lib/dashboard/**
  - Depends on: A-05
  - Goal: 完成 KPI、趋势图、高频问题、未解决问题和最近线索模块

- [ ] C-02 文件上传与文档状态机
  - Owner: Codex
  - Branch: feature/C-02-upload
  - Scope: apps/api/**, apps/worker/**, migration/**
  - Blocked by: C-01
  - Goal: 完成文件上传、文档状态流转、队列处理和基础测试

## Review

- [ ] P-01 控制台基础布局
  - Owner: Cursor
  - Reviewer: You
  - Notes: 登录页、侧边栏、顶栏和基础布局已经可用，待统一验收

## Done

- [x] A-00 仓库与文档包
- [x] A-01 项目初始化
- [x] A-02 工程骨架与模块目录
- [x] A-03 环境变量校验与 `.env.example`
- [x] A-04 ESLint、Prettier、Husky、CI 基础检查
- [x] A-05 设计系统与基础 UI
  - Owner: Codex
  - Branch: feature/A-05-design-system
  - Scope: packages/ui/**, apps/console/src/app/globals.css, apps/console/src/components/**
  - Result: 完成 Design Token、Tailwind preset、核心 UI 组件、控制台登录页与基础布局

- [x] G-01 GitHub Project / Issues 任务流模板
  - Owner: Codex
  - Scope: .github/**, docs/github-project-workflow.md, scripts/create-gh-*.ps1
  - Result: 完成 Project 初始化脚本、Issue 表单、PR 模板、标签定义、种子 Issue 脚本和 PM 巡检提示词

## 协作规则

- 每个任务只保留一个清晰的 Task ID。
- Cursor 负责前端 UI、Design System、响应式、前端表单和页面体验。
- Codex 负责后端 API、数据库、鉴权、队列、SSE、部署和测试。
- 开始新任务前先建分支，完成后再合并。
- 任务完成后，先更新这里，再更新 `COMMAND.md`。
