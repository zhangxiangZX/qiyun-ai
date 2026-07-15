# qiyun-widget

工业官网 AI 客服嵌入挂件（P0-1）。

## 能力

- `<script>` + `data-bot-id` / `data-site-key` 嵌入
- Shadow DOM 样式隔离
- 悬浮入口、聊天面板、SSE 流式回复、来源引用
- 移动端适配、加载/错误状态
- 构建产物同步至 `apps/api/assets/widget.js`

## 开发

```bash
pnpm --filter qiyun-widget install
pnpm --filter qiyun-widget dev
```

## 构建

```bash
pnpm --filter qiyun-widget build
```

## 更新已安装站点的外观

Widget 样式来自 API 的 `/public/widget.js`，客户网站里的 `data-bot-id` / `data-site-key` 不用改。

1. 构建并同步：`pnpm --filter qiyun-widget build`
2. Docker 环境需重启 API，或重建镜像（本地 compose 已挂载 `apps/api/assets/widget.js`）
3. 在嵌入脚本的 `src` 后加 `?v=2` 可绕过浏览器缓存
4. 页面 **Ctrl+F5** 强刷

## 嵌入示例

```html
<script
  src="https://your-api.example.com/public/widget.js?v=2"
  data-bot-id="bot_xxx"
  data-site-key="pk_xxx"
  data-title="企云 AI 客服"
  data-welcome="您好，欢迎咨询产品与选型问题。"
></script>
```

## 任务边界

- **P0-1（本包）**：Widget UI + SSE 消费
- **P0-4（后续）**：工业留资表单 + 控制台线索详情（等 Codex 契约）

详见 [docs/17-p0-collaboration-briefs.md](../../docs/17-p0-collaboration-briefs.md)。
