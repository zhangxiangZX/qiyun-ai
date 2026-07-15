# MVP-V1-C05

## 用户价值

企业可在机器人基础设置中配置官网 Widget 首次展示的推荐问题，降低访客开口门槛。

## 闭环环节

Console 配置 → API 持久化 → Widget 读取（D-04）→ 访客点击提问

## 不做什么

- 不做 Widget UI 完整实现（D-04）
- 不做推荐问题点击统计
- 不做 AI 自动生成推荐问题

## 验收

- [x] Bot 模型含 `recommendedQuestions: string[]`（最多 6 条）
- [x] `PATCH /bots/:id` 可保存推荐问题
- [x] `GET /public/widget/config` 返回欢迎语与推荐问题
- [x] SSE `meta` 事件携带 `welcomeMessage` 与 `recommendedQuestions`
- [x] Console 基础设置页可编辑推荐问题
- [x] API 测试覆盖持久化与 public config

## 实现摘要

- Migration: `011_bot_recommended_questions.sql`
- 规范化: `apps/api/src/rag/recommended-questions.ts`
- Public API: `GET /public/widget/config?botId=&siteKey=&origin=`
