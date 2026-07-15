# 当前任务看板

Qiyun AI / 企云图 AI

> 产品结构（冻结）：`docs/36-v1-product-structure-final.md`（**7 个一级主类，不得再改**）
>  
> 当前唯一验收边界：`docs/28-v1-acceptance-matrix.md`
>  
> V1 只认七大模块：
> 1. 工作台
> 2. 客户机会
> 3. 获客中心
> 4. AI中心
> 5. 报价管理
> 6. 数据中心
> 7. 系统设置
>
> 超出以上边界的能力，统一记入 `docs/BACKLOG.md`，不计入 V1 交付承诺。

## Doing

- [x] V1-ACC-01 全链路最终验收（第三轮冒烟 + Playwright 复跑 2026-07-12）
  - Owner: Cursor
  - Evidence: `docs/31-v1-acceptance-record-2026-07-10.md` §十五 · `ACC01-CHECKLIST-REPORT.json` · UI/BF/CJ 报告
  - Result: 页面 33/33 + API 12/12 + demo PASS；UI 49/49；BF 26/26；CJ 16/16
  - Remaining: 产品按 docs/29 §11 手工闭环签字

- [ ] V1-ACC-02 演示环境实机回归
  - Owner: Codex
  - Scope: Console / API / Worker / PostgreSQL / Redis / Qdrant / MinIO
  - Goal: 运行 `scripts/run-demo-acceptance.ps1` 并记录结果
  - **2026-07-10 晚：PASS（无 degraded）**
  - **2026-07-12：PASS（无 degraded）**
  - Note: 生产需保持 `/health` 全绿
## Ready for Codex

（暂无）

## Ready for Cursor

- [x] V1-FE-01 AI选型页编辑器与手机端验收收边
  - Module: 03 获客入口
  - Status: DONE（布局适配 + 页头收简；移动端预览随断点折叠）
  - Scope: `apps/console/src/styles/ai-standalone-edit.module.css`, `ai-standalone-edit-workspace.tsx`

- [x] V1-FE-02 报价模板与客户查看页视觉收边
  - Module: 07 报价管理
  - Status: DONE（去掉 V2 灰按钮、页头/操作列/模板入口抛光）
  - Scope: `quotes-workspace.tsx`, `quote-management.module.css`, `template-list-workspace.tsx`

- [x] V1-FE-03 系统设置页信息架构收口
  - Module: 09 系统设置 + 导航复核
  - Status: DONE（侧栏对齐 docs/36；询盘分配改隐藏匹配；快捷入口改指询盘/AI测试）
  - Scope: `navigation.ts`, home overview / dashboard links

## Review

- [ ] V1-REV-01 按验收矩阵复核控制台导航
  - Reviewer: Codex / 产品
  - Note: 侧栏已对齐 `docs/36` 七大主类可见项；请人工点一遍侧栏确认无 V2 入口

- [ ] V1-REV-02 按验收矩阵复核后端路由范围
  - Reviewer: Codex
  - Goal: 确认 V1 页面对应的后端接口都已具备可演示能力

## Done

- [x] V1-DONE-01 工作台三角色首页收口
  - Module: 01 工作台

- [x] V1-DONE-02 企业与账号主链路
  - Module: 02 企业与账号

- [x] V1-DONE-03 获客入口主页面
  - Module: 03 获客入口

- [x] V1-DONE-04 AI能力中心主链路
  - Module: 04 AI能力中心

- [x] V1-DONE-05 客户机会主链路
  - Module: 05 客户机会

- [x] V1-DONE-06 销售跟进主链路
  - Module: 06 销售跟进

- [x] V1-DONE-07 报价管理主链路
  - Module: 07 报价管理

- [x] V1-DONE-08 数据中心基础报表
  - Module: 08 数据中心

- [x] V1-DONE-09 系统设置基础能力
  - Module: 09 系统设置

- [x] V1-BE-01 报价模板 / PDF / 客户查看页收尾
  - Module: 07 报价管理
  - Report: `docs/33-v1-demo-acceptance-report-final.md` §五

- [x] V1-BE-02 操作日志基础验收收口
  - Module: 09 系统设置
  - Report: `docs/33-v1-demo-acceptance-report-final.md` §五

- [x] V1-BE-03 Demo 验收报告落档
  - Module: 交付
  - Deliverable: `docs/33-v1-demo-acceptance-report-final.md`

- [x] V1-FE-01 AI选型页编辑器适配收边
- [x] V1-FE-02 报价页视觉抛光
- [x] V1-FE-03 + REV-01 导航 V2 收口（代码侧）

## Pause

- [ ] V2-PAUSE-01 客户运营 / 复购 / 售后
- [ ] V2-PAUSE-02 套餐 / 账单 / 商业化能力
- [ ] V2-PAUSE-03 高级权限 / 字段权限 / 数据权限
- [ ] V2-PAUSE-04 高级数据分析 / ROI 深分析
- [ ] V2-PAUSE-05 复杂渠道 API / 企业微信 / 广告深度集成

参考文档：

- `docs/28-v1-acceptance-matrix.md`
- `docs/33-v1-demo-acceptance-report-final.md`
- `docs/31-v1-acceptance-record-2026-07-10.md`
- `docs/MVP-V1-0-GAP-STATUS.md`
- `docs/BACKLOG.md`
