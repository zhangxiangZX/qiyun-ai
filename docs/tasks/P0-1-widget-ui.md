# Task ID: P0-1

## 用户价值

帮助工业设备企业在官网嵌入 AI 客服挂件，让访客无需注册即可咨询产品问题，销售侧获得可跟进的对话入口。

## 对核心闭环的影响

- [x] 官网接待
- [x] 产品问答
- [ ] 选型追问（P0-3 Codex）
- [ ] 留资（P0-4，等契约）
- [ ] 销售跟进
- [ ] 内容优化

## 用户故事

作为**工业企业官网访客**，我希望**在页面右下角打开咨询窗口并看到流式回答与资料来源**，从而**快速判断产品是否匹配需求**。

## 不做什么

- 不做完整工业留资表单（P0-4）
- 不做 SSO / 企微 / 钉钉 / 飞书接入（P2）
- 不改 `apps/api` 公共聊天 SSE 实现（P0-2 Codex）
- 不改数据库 schema / migration
- 不新增大型 UI 框架依赖

## 允许修改目录

```text
apps/widget/**
apps/api/assets/widget.js（构建同步产物）
docs/tasks/P0-1-widget-ui.md
```

## 禁止修改目录

```text
apps/api/src/**
apps/worker/**
apps/console/**
infra/**
packages/ui/**（除非 P0-1 明确需要共享组件，当前不需要）
```

## 接口影响

- **消费**已有契约：`POST /public/chat/stream`（SSE）、后续 P0-4 的 `POST /public/leads`
- **不新增** API route

## 数据库影响

无

## 验收标准

1. 可通过 `<script data-bot-id data-site-key>` 嵌入，Shadow DOM 不污染宿主样式
2. 悬浮入口 + 聊天面板，移动端可用（≤480px 宽度适配）
3. SSE 流式展示回复与来源引用；网络/403/429 有可读错误态
4. `pnpm --filter qiyun-widget typecheck && pnpm --filter qiyun-widget test && pnpm --filter qiyun-widget build` 通过
5. 构建产物同步至 `apps/api/assets/widget.js`
