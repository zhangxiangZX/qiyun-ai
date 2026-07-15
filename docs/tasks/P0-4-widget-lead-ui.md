# Task ID: P0-4

## 用户价值

访客在 Widget 内完成工业留资；销售在控制台看到 AI 摘要、来源站点与关键问题。

## 对核心闭环的影响

- [x] 留资
- [x] 销售跟进

## 不做什么

- 不改 `apps/api` SSE/留资规则（P0-2/P0-3 已完成）
- 不做 CRM 导出增强、附件上传

## 允许修改目录

`apps/widget/**`、`apps/console/src/lib/leads/**`、`apps/console/src/components/leads/**`

## 验收标准

1. Widget：`done.needsLeadCapture` 时展示工业留资表单并成功提交
2. Console 线索详情展示 summary、来源站点、需求描述
3. widget/console 相关测试通过
