# 05 API 设计（REST + SSE）

统一前缀：`/api/v1`  
认证：控制台使用 Bearer JWT；Widget 使用 siteKey + origin 校验。

## 1. 控制台 API
| 方法 | 路径 | 说明 |
|---|---|---|
| POST | /auth/register | 注册 |
| POST | /auth/login | 登录 |
| GET | /workspaces | 可访问工作区列表 |
| GET | /workspaces/current | 当前工作区 |
| POST | /workspaces/:id/activate | 切换当前工作区 |
| POST | /knowledge-bases | 创建知识库 |
| POST | /knowledge-bases/:id/documents | 上传文件 |
| GET | /documents/:id | 文档状态（含 `errorCode` / `errorMessage`） |
| DELETE | /documents/:id | 删除文档并清理索引 |
| POST | /documents/:id/reindex | 重建索引 |
| POST | /bots | 创建机器人 |
| PATCH | /bots/:id | 更新机器人 |
| PUT | /bots/:id/knowledge-bases | 设置机器人关联知识库 |
| POST | /sites/:id/rotate-key | 轮换站点密钥 |
| GET | /bots/:id/embed-code | 获取嵌入代码 |
| GET | /conversations | 会话列表；支持 `limit`/`cursor`/`botId`/`status`/`hasLead`/`q` |
| GET | /conversations/:id | 会话详情 |
| GET | /leads | 线索列表 |
| GET | /leads/:id | 线索详情（含 attachments、followUpRecords） |
| GET | /leads/:id/attachments/:attachmentId | 下载线索附件 |
| PATCH | /leads/:id | 更新线索状态/备注 |
| GET | /notifications | 通知 feed（items、unreadCount） |
| POST | /notifications/read | 标记已读 `{ ids?: string[]; all?: boolean }` |
| GET | /dashboard | 看板聚合；查询参数 `from`/`to`/`botId`（YYYY-MM-DD） |
| GET | /reports | 报表聚合；查询参数同 `/dashboard` |


控制台 workspace 上下文由服务端维护，不直接信任请求体中的 `workspaceId`。前端切换工作区后，应通过 `/workspaces/:id/activate` 更新当前会话上下文，再发起后续请求。

## 2. Widget API
### POST /public/chat/stream
请求：
```json
{
  "botId": "bot_xxx",
  "siteKey": "pk_xxx",
  "visitorId": "v_xxx",
  "conversationId": "optional",
  "sdkVersion": "1.0.0",
  "message": "产品保修多久？"
}
```
响应：`text/event-stream`

事件：
```text
event: meta
data: {"conversationId":"c_xxx"}

event: token
data: {"text":"您好，"}

event: citations
data: {"items":[{"title":"产品手册.pdf","chunkId":"chunk_xxx","score":0.88}]}

event: done
data: {"needsLeadCapture":false,"messageId":"m_xxx","leadFields":["name","phone","email","company","requirement"]}

event: error
data: {"code":"PROVIDER_ERROR","message":"模型服务暂时不可用，已切换为基础回复。"}
```

`429` 响应体示例：

```json
{
  "code": "RATE_LIMITED",
  "message": "Too many public chat requests. Retry after 42 seconds.",
  "retryAfterSec": 42
}
```

### POST /public/leads
```json
{
  "botId":"bot_xxx",
  "siteKey":"pk_xxx",
  "conversationId":"c_xxx",
  "fields":{"name":"张先生","phone":"138****0000","company":"某某设备","requirement":"冷水机报价"}
}
```

响应 `201` 含 `keyQuestion`、`summary`、`sourceSiteId`、`sourceSiteName`。

**同会话去重（E-08）：** 同一 `conversationId` 二次提交时 **仍返回 `201`**，响应体为合并后的同一条线索（`id` 不变）；字段按「非空保留 + 新值覆盖」合并；附件按文件名/大小/校验和去重合并。不会创建第二条 lead 记录。

### GET /notifications

`items[].kind` 枚举：`lead` | `document` | `invite`。

### GET /leads/:id 附件字段

`attachments[]`：`id`, `fileName`, `mimeType`, `sizeBytes`, `uploadedAt`, `status`（`ready`/`pending`/`failed`）, `downloadUrl`, `errorMessage?`

`followUpRecords[]`：`id`, `kind`（`system`/`status`/`assignee`/`note`）, `title`, `body?`, `actor?`, `createdAt` — PATCH 后追加持久化于 `follow_up_records`

`PATCH /leads/:id` 会按状态/负责人/备注变更追加时间线条目。

## 3. 统一错误结构
```json
{
  "code": "DOMAIN_NOT_ALLOWED",
  "message": "当前域名未授权",
  "requestId": "req_xxx"
}
```

错误码最小集合：
`UNAUTHORIZED`、`FORBIDDEN`、`NOT_FOUND`、`VALIDATION_ERROR`、`RATE_LIMITED`、`DOMAIN_NOT_ALLOWED`、`BOT_DISABLED`、`DOCUMENT_NOT_READY`、`PROVIDER_ERROR`。

| HTTP | code | 场景 |
|---|---|---|
| 400 | VALIDATION_ERROR | 请求参数校验失败 |
| 401 | UNAUTHORIZED | 未登录、签名失效或凭据无效 |
| 403 | FORBIDDEN / DOMAIN_NOT_ALLOWED / BOT_DISABLED | 无权限、域名未授权或机器人禁用 |
| 404 | NOT_FOUND | 资源不存在或当前工作区不可见 |
| 429 | RATE_LIMITED | 触发速率限制 |
| 502 / 503 | PROVIDER_ERROR | 模型或下游服务失败 |
