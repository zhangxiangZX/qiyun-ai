# MVP-V1-D04

## 用户价值

官网 Widget 首次打开时展示机器人配置的欢迎语与推荐问题，访客可一键发起咨询。

## 闭环环节

C-05 API 配置 → Widget 拉取 `/public/widget/config` → 展示 chip → 点击发送

## 不做什么

- 不做推荐问题点击统计
- 不做主题/头像 D-10

## 验收

- [x] 打开 Widget 后请求 `GET /public/widget/config`
- [x] 展示 API 返回的欢迎语（失败时回退 `data-welcome`）
- [x] 展示推荐问题 chip，点击即发送
- [x] 用户发送首条消息后隐藏推荐问题
- [x] E2E 覆盖推荐问题点击流程

## 实现摘要

- `apps/widget/src/lib/widget-config-api.ts`
- `apps/widget/src/components/RecommendedQuestions.tsx`
- `WidgetRoot` 首次打开拉取配置并更新欢迎语
