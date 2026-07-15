# Task ID: P0-2

## 用户价值

官网 Widget 能稳定调用公共聊天接口，获得流式回答、来源引用，并在异常时得到可读错误。

## 对核心闭环的影响

- [x] 官网接待
- [x] 产品问答
- [ ] 留资（P0-3/P0-4）
- [ ] 销售跟进

## 不做什么

- 不改 Widget UI（Cursor P0-1/P0-4）
- 不新增 Worker 异步任务
- 不替换 LLM/RAG 技术栈

## 允许修改目录

`apps/api/src/chat/**`、`apps/api/src/nest/chat/**`、`apps/api/src/http/**`、`migration/**`

## 验收标准

1. SSE 事件含 meta/token/citations/done，LLM 失败时发 error 并降级回复
2. 域名未授权返回 `DOMAIN_NOT_ALLOWED`；机器人禁用返回 `BOT_DISABLED`
3. 429 响应含 `retryAfterSec`；会话 resume 校验 visitorId

---

# Task ID: P0-3

## 用户价值

识别报价/图纸/交期等高意向咨询，引导留资并生成线索摘要供销售跟进。

## 对核心闭环的影响

- [x] 选型追问
- [x] 留资
- [x] 销售跟进

## 不做什么

- 不做 Widget 留资表单 UI（P0-4）
- 不做 CRM 全功能

## 允许修改目录

`apps/api/src/chat/**`、`apps/api/src/rag/bot-defaults.ts`、`migration/008_lead_summary.sql`

## 验收标准

1. 高意向关键词命中 → `done.needsLeadCapture: true`（即使有 RAG 命中）
2. `POST /public/leads` 校验工业字段；写入 keyQuestion、summary、sourceSite
3. 单测覆盖 intent 检测与字段校验
