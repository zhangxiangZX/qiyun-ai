# Next Hardening Board

Last updated: 2026-07-05

## Doing Next

- [ ] H-10 Console preview/upstream wording收口
  - Owner: Cursor
  - Scope: `apps/console/src/components/**`, `apps/console/src/lib/**`
  - Depends on: `docs/19-console-upstream-audit.md`
  - Goal: 统一 Dashboard / Reports / Bots / Leads / Sites / Notifications 的模式文案，禁止把 preview 写成真实写入

- [x] H-11 Bot 编辑页 preview 写入策略定案
  - Owner: Codex
  - Scope: `apps/console/src/lib/bots/**`, `apps/console/src/components/bots/**`, docs
  - Result: V1 已定为 preview 只读，不再伪创建/伪保存

- [ ] I-10 提交批次整理与分支落地
  - Owner: Codex
  - Scope: docs + git strategy
  - Depends on: `docs/20-submit-order-2026-07-05.md`
  - Goal: 先 docs，再 backend，再 console，再 infra，减少冲突和回滚成本

- [ ] I-11 全页面人工验收执行
  - Owner: Cursor + Codex
  - Scope: Console / API / Widget
  - Depends on: `docs/21-page-acceptance-runbook.md`
  - Goal: 逐页回归，把结果回写发布清单

## Ready For Cursor

- [ ] C-H10-1 Dashboard / Reports 模式提示统一
- [ ] C-H10-2 Bots 页面 preview/upstream 提示统一
- [ ] C-H10-3 Leads / Sites / Notifications 状态文案统一
- [ ] C-I11-1 按 runbook 执行桌面端逐页验收
- [ ] C-I11-2 按 runbook 执行移动端逐页验收

## Ready For Codex

- [ ] X-H11-1 审核 bots preview 写入路径
- [ ] X-H11-2 定义是否允许 preview create/save
- [ ] X-I10-1 按批次整理可提交文件清单
- [ ] X-I10-2 标出建议提交顺序和 reviewer 顺序

## Done This Round

- [x] 修复通知已读态被过滤的问题
- [x] 修复高意向连续咨询被冷却误伤的问题
- [x] 修复站点白名单子串绕过测试
- [x] 补齐 API 自动化回归并跑绿
- [x] 产出 upstream audit / submit order / page acceptance runbook
- [x] 收口 Bots preview 写入策略为只读
