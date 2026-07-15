# 企云图 AI V1.0 验收矩阵

最后更新：2026-07-10

## 目的

本文件用于把《企云图 AI 最终产品架构 V1.0》落成可执行验收基线。

验收只认两件事：

1. 是否属于 V1 九大一级模块
2. 是否已经达到“能演示、能联通、能形成业务闭环”的标准

不在本矩阵内的功能，不计入 V1 交付承诺。

---

## 状态说明

| 状态 | 含义 |
|------|------|
| DONE | 已有页面/接口/主流程，达到 V1 验收范围 |
| PARTIAL | 已有主体，但仍有预览态、假数据、联调或体验缺口 |
| MISSING | 当前尚未形成可验收能力 |
| V2 | 明确超出 V1，不纳入本轮验收 |

---

## V1 总体闭环

目标闭环：

`客户来源 -> AI选型 / 官网Widget / 销售链接 / 快速录入 -> 询盘生成 -> AI整理需求 -> 销售跟进 -> 报价 -> 成交`

当前判断：

| 环节 | 状态 | 说明 |
|------|------|------|
| 客户来源入口 | DONE | AI 选型页、官网 Widget、销售链接、快速录入均已具备入口 |
| 询盘生成 | DONE | 询盘 / 线索 / 会话链路已存在 |
| AI整理需求 | DONE | 知识库、RAG、AI摘要、意向识别已落地 |
| 销售跟进 | DONE | 跟进任务、跟进记录、状态流转已具备 |
| 报价 | DONE | 报价列表、详情、阶段更新、跟进补充已具备 |
| 成交 | PARTIAL | 已有阶段流转与统计入口，但成交后运营属于 V2，不纳入本轮 |

---

## 一级模块验收矩阵

### 01 工作台

| 子项 | 状态 | 说明 |
|------|------|------|
| 老板首页 | DONE | 已有老板角色首页，覆盖经营看板、线索和报价入口 |
| 管理员首页 | DONE | 已有管理员工作台，覆盖配置状态、未分配线索等 |
| 销售首页 | DONE | 已有销售首页，覆盖我的线索、任务、报价、销售链接 |

参考实现：

- `apps/console/src/components/dashboard/boss-dashboard-workspace.tsx`
- `apps/console/src/components/dashboard/admin-dashboard-workspace.tsx`
- `apps/console/src/components/dashboard/sales-rep-dashboard-workspace.tsx`

### 02 企业与账号

| 子项 | 状态 | 说明 |
|------|------|------|
| 登录页 | DONE | 已具备账号登录、验证码登录等能力 |
| 找回密码 | DONE | 已有忘记密码与重置流程 |
| 首次修改密码 | DONE | 已有首次改密链路 |
| 个人设置 | PARTIAL | 有基础能力，但仍需和企业设置边界继续整理 |
| 企业空间选择 | DONE | 已有工作区/多租户上下文 |
| 团队成员 | DONE | 已有成员列表、邀请、角色基础链路 |
| 角色权限（基础） | DONE | Owner / Admin / Member 基础权限已具备 |

参考实现：

- `apps/console/src/app/login`
- `apps/console/src/app/forgot-password`
- `apps/console/src/app/reset-password`
- `apps/console/src/app/dashboard/team`
- `apps/api/src/nest/auth`

### 03 获客入口

| 子项 | 状态 | 说明 |
|------|------|------|
| AI选型页管理 | DONE | 已形成正式配置管理页 |
| 新建 / 编辑 AI选型页 | PARTIAL | 入口已在，但编辑器体验仍可继续收边 |
| 手机端 AI选型页 | PARTIAL | 已有页面雏形，但需按正式 V1 演示再验 |
| 提交成功页 | DONE | 已有成功反馈页 |
| 官网 Widget 管理 | DONE | 站点、安装、域名、预览和校验链路已在 |
| 销售链接管理 | DONE | 列表、详情入口、二维码分发入口已在 |

参考实现：

- `apps/console/src/app/dashboard/bots/landing`
- `apps/console/src/app/dashboard/sites`
- `apps/console/src/app/dashboard/channels/links`
- `apps/api/src/nest/selection-pages`
- `apps/api/src/nest/sales-links`

### 04 AI能力中心

| 子项 | 状态 | 说明 |
|------|------|------|
| 助手列表 | DONE | 已有机器人/助手列表与配置页 |
| 助手配置 | DONE | 已支持欢迎语、推荐问题、规则等主体 |
| AI对话测试 | DONE | 已有测试与预览链路 |
| AI行为规则 | DONE | 已有转人工、留资、规则控制基础 |
| 知识库列表 | DONE | 已有知识库管理入口 |
| 知识库上传 | DONE | 已有上传、解析、状态跟踪 |
| 资料详情 / 测试 | DONE | 已有文档状态、失败原因、测试链路 |

参考实现：

- `apps/console/src/app/dashboard/bots`
- `apps/console/src/app/dashboard/knowledge-bases`
- `apps/api/src/nest/rag`
- `apps/api/src/nest/documents`

### 05 客户机会

| 子项 | 状态 | 说明 |
|------|------|------|
| 快速录入 | DONE | 已有入口和处理流程 |
| AI整理结果 | DONE | 已有客户信息、摘要、缺失信息和意向结构 |
| 询盘中心 | DONE | 已有询盘 / 线索列表页 |
| 询盘详情 | DONE | 已有关联信息、附件、记录、报价入口 |
| 状态机 | DONE | 新询盘、跟进中、待补充、待报价、已报价、成交、丢单主线已具备 |

参考实现：

- `apps/console/src/app/dashboard/quick-entry`
- `apps/console/src/app/dashboard/leads`
- `apps/console/src/app/dashboard/inquiries`
- `apps/api/src/nest/sales`

### 06 销售跟进

| 子项 | 状态 | 说明 |
|------|------|------|
| 跟进任务 | DONE | 已有任务页与跟进动作入口 |
| 新建跟进任务 | DONE | 已有跟进记录/任务补充能力 |
| 跟进记录详情 | DONE | 已形成时间线和跟进记录 |
| 自动创建首次跟进 | DONE | 线索进入后已具备自动跟进链路基础 |
| 报价后跟进 | DONE | 报价详情可追加跟进记录，阶段联动已在 |

参考实现：

- `apps/console/src/app/dashboard/tasks`
- `apps/console/src/components/leads`
- `apps/console/src/components/sales/quote-detail-workspace.tsx`
- `apps/api/src/sales`

### 07 报价管理

| 子项 | 状态 | 说明 |
|------|------|------|
| 报价管理 | DONE | 已接正式报价接口模型 |
| 新建报价 | PARTIAL | 入口已在，但创建体验仍可继续补强 |
| 报价详情 | DONE | 已有详情、状态流转、跟进补充 |
| 报价编辑 | PARTIAL | 已有编辑相关结构，但仍需继续验收 |
| 报价模板管理 | PARTIAL | 模板页已在，但属于“可演示，待深收边”状态 |
| 报价 PDF 预览 | PARTIAL | 已有模板预览与导出方向，但需最终演示验收 |
| 客户报价查看页 | PARTIAL | 已有基础链路，但需按最终 V1 流程再校验 |

参考实现：

- `apps/console/src/app/dashboard/quotes`
- `apps/console/src/components/sales/quotes-management-workspace.tsx`
- `apps/console/src/components/sales/quote-detail-workspace.tsx`
- `apps/console/src/components/quotes`
- `apps/api/src/nest/sales`

### 08 数据中心

| 子项 | 状态 | 说明 |
|------|------|------|
| 成交漏斗 | DONE | 已有基础销售分析能力 |
| 渠道分析 | DONE | 已有渠道分析页面 |
| 销售跟进分析 | DONE | 已有跟进分析页面 |
| 报表导出 | DONE | 已有导出页 |
| 基础指标 | DONE | 询盘、报价、成交、金额、来源渠道基础口径已存在 |

参考实现：

- `apps/console/src/app/dashboard/reports`
- `apps/console/src/app/dashboard/reports/channel`
- `apps/console/src/app/dashboard/reports/follow-up`
- `apps/console/src/app/dashboard/reports/export`
- `apps/api/src/nest/analytics`
- `apps/api/src/nest/sales`

### 09 系统设置

| 子项 | 状态 | 说明 |
|------|------|------|
| 企业资料 | DONE | 已有企业资料页 |
| 团队成员 | DONE | 已有团队管理主入口 |
| 角色权限（基础） | DONE | 已有基础角色权限页 |
| 操作日志（基础） | PARTIAL | 入口和基础结构已在，但仍需按 V1 基础口径继续校验 |

参考实现：

- `apps/console/src/app/dashboard/team/profile`
- `apps/console/src/app/dashboard/team`
- `apps/console/src/app/dashboard/team/roles`
- `apps/console/src/app/dashboard/logs`
- `apps/api/src/nest/audit`

---

## 当前 V1 关键验收判断

### 可以计入 V1 已完成的部分

- 多租户与工作区隔离主链路
- 登录 / 邀请 / 基础角色
- AI 选型页 / Widget / 销售链接三类获客入口
- 知识库 / 上传 / 文档处理 / RAG 基础链路
- 询盘 / 线索 / 快速录入 / AI整理
- 跟进任务与销售推进
- 报价管理与详情流转
- 基础数据中心

### 仍建议作为 V1 收尾项继续盯的部分

- AI选型页编辑体验与手机端最终验收
- 报价模板 / PDF / 客户查看页的最终演示闭环
- 操作日志的基础验收口径
- 若干页面仍存在“可演示但需继续收边”的 UI 问题

---

## 明确不计入 V1 的内容

以下能力即使仓库中已经出现，也统一按 V2 或扩展能力处理：

| 能力 | 状态 | 处理原则 |
|------|------|----------|
| 客户运营 / 复购 / 售后 | V2 | 不纳入 V1 验收 |
| 套餐 / 账单 / 商业化计费 | V2 | 不纳入 V1 验收 |
| 高级权限 / 字段权限 / 复杂数据权限 | V2 | V1 只认基础角色 |
| 更重的 CRM 客户经营能力 | V2 | V1 只聚焦询盘到成交 |
| 复杂渠道 API / 企业微信 / 广告深度集成 | V2 | V1 只保留基础渠道入口能力 |
| 高级数据分析 / ROI 深分析 | V2 | V1 只认基础数据中心 |

参考：

- `docs/BACKLOG.md`
- `docs/MVP-V1-0-GAP-STATUS.md`

---

## 建议验收顺序

1. 先验主闭环  
   获客入口 -> 询盘 -> AI整理 -> 跟进 -> 报价 -> 成交

2. 再验多租户与角色  
   企业空间 -> 成员 -> 权限 -> 数据隔离

3. 再验 AI 基础设施  
   知识库 -> 文档处理 -> RAG -> Widget / 选型页问答

4. 最后验老板/管理员/销售三套工作台和数据中心

---

## 本文档与其他文档关系

- 产品边界：`docs/01-product-overview.md`
- MVP 需求：`docs/02-prd-mvp.md`
- 页面定义：`docs/06-pages.md`
- 当前差距：`docs/MVP-V1-0-GAP-STATUS.md`
- 超范围功能：`docs/BACKLOG.md`
