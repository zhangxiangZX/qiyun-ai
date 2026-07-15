# 官网 Widget 样式补齐 — 完成

## 做了什么
对照设计稿，把官网右下角 AI 客服 Widget 的 UI 统一补齐：
- 蓝色渐变头部，含机器人头像、标题「企云 AI 客服助手」、绿色「在线」徽章、关闭按钮。
- 聊天面板内助手消息左侧增加机器人头像，用户消息右侧增加头像。
- 底部输入框改为圆角条，placeholder 为「请输入您的问题...」，左侧含附件/表情图标，发送按钮改为圆形箭头。
- 面板底部增加「Powered by 企云 AI」。
- 右下角启动按钮改为蓝色圆形机器人图标，带红色未读角标（默认 2）。
- 面板宽度从 560px 调整为 384px，更贴近设计稿；保留移动端响应式。
- 默认标题和欢迎语已同步改为设计稿文案。

## 新增/修改文件
- 新增：`apps/widget/src/components/icons.tsx`（机器人、关闭、附件、表情、发送 SVG 图标）
- 修改：
  - `apps/widget/src/lib/config.ts`
  - `apps/widget/src/styles/widget.module.css`
  - `apps/widget/src/components/ChatPanel.tsx`
  - `apps/widget/src/components/MessageBubble.tsx`
  - `apps/widget/src/components/ChatComposer.tsx`
  - `apps/widget/src/components/ChatLauncher.tsx`
  - `apps/widget/src/components/WidgetRoot.tsx`

## 验证结果
- `pnpm exec tsc --noEmit`：通过。
- `pnpm exec tsx --test src/**/*.test.ts`：11/11 通过。
- `pnpm exec vite build`：通过。
- Playwright 截图：启动按钮与展开面板均符合设计稿。

## 后续建议
- 附件、表情按钮当前为纯样式占位（点击无实际功能），后续接入对应能力时可直接复用图标和按钮结构。
- 未读角标目前是默认 `2`，未来可接入真实消息计数后从业务状态传入。
