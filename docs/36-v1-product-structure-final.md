# 企云图 AI V1 最终产品结构

最后更新：2026-07-11

**冻结说明：** 本文档为 V1 一级主类最终版。后续**不得修改 7 个一级分类**，仅在各页面内部增删功能。

相关文档：

- 使用流程培训：`docs/35-v1-usage-flow-guide.md`
- 验收矩阵：`docs/28-v1-acceptance-matrix.md`

---

## 产品目标

帮助工业企业把客户咨询转化为询盘，再完成跟进、报价和成交。

**核心闭环：**

```text
客户来源
  ↓
AI选型页 / 官网Widget / 销售链接 / 快速录入
  ↓
询盘
  ↓
AI整理需求
  ↓
销售跟进
  ↓
报价
  ↓
成交 / 丢单
  ↓
老板查看数据
```

---

## V1 产品结构树（冻结）

```text
企云图 AI V1
├── 工作台
│   ├── 老板首页
│   ├── 管理员首页
│   └── 销售首页
│
├── 客户机会
│   ├── 快速录入
│   ├── 询盘中心
│   ├── 询盘详情
│   ├── 跟进任务
│   └── 跟进记录
│
├── 获客中心
│   ├── AI选型页
│   ├── 官网Widget
│   ├── 销售链接
│   └── 二维码管理
│
├── AI中心
│   ├── AI助手
│   ├── 知识库
│   └── AI测试
│
├── 报价管理
│   ├── 报价列表
│   ├── 新建报价
│   ├── 报价详情
│   ├── 报价模板
│   ├── PDF预览
│   └── 客户报价页
│
├── 数据中心
│   ├── 成交漏斗
│   ├── 渠道分析
│   ├── 销售分析
│   └── 报表导出
│
└── 系统设置
    ├── 企业资料
    ├── 团队成员
    ├── 角色权限
    ├── 操作日志
    └── 个人设置
```

**侧栏规则：** 上树中标注为「详情 / 子流程」的页面（询盘详情、跟进记录、新建报价、PDF 预览、客户报价页等）**不出现在侧栏**，通过列表页进入；侧栏只展示可直接进入的管理入口。

---

## 01 工作台

**作用：** 不同角色进入系统后的首页。

| 页面 | Console 路由 |
|------|--------------|
| 老板首页 | `/dashboard/boss` |
| 管理员首页 | `/dashboard/admin` |
| 销售首页 | `/dashboard/sales-rep` |

---

## 02 客户机会（核心）

**作用：** 管理所有客户线索与跟进。

| 页面 | 侧栏 | Console 路由 |
|------|------|--------------|
| 快速录入 | 可见 | `/dashboard/quick-entry` |
| 询盘中心 | 可见 | `/dashboard/inquiries` |
| 询盘详情 | 隐藏 | `/dashboard/inquiries/[id]`、`/dashboard/inquiries/detail` |
| 跟进任务 | 可见 | `/dashboard/tasks` |
| 跟进记录 | 隐藏 | `/dashboard/leads/[id]/follow-ups`、询盘/客户详情时间线 |

**询盘状态：** 新询盘、待分配、跟进中、待补充、待报价、已报价、成交、丢单、无效。

**V2 保留（侧栏隐藏）：** 我的客户 `/dashboard/customers`、线索列表 `/dashboard/leads` 等。

---

## 03 获客中心（核心）

**作用：** 客户进入系统的入口。

| 页面 | 侧栏 | Console 路由 |
|------|------|--------------|
| AI选型页 | 可见 | `/dashboard/bots/landing` |
| 官网 Widget | 可见 | `/dashboard/sites` |
| 销售链接 | 可见 | `/dashboard/channels/links` |
| 二维码管理 | 可见 | `/dashboard/channels/qrcodes` |

新建/编辑选型页、站点配置、链接详情等子页侧栏隐藏。

---

## 04 AI中心

**作用：** 管理 AI 能力。

| 页面 | 侧栏 | Console 路由 |
|------|------|--------------|
| AI助手 | 可见 | `/dashboard/bots` |
| 知识库 | 可见 | `/dashboard/knowledge-bases` |
| AI测试 | 可见 | `/dashboard/conversations/test` |
| 助手配置 / 会话详情 | 隐藏 | `/dashboard/bots/[id]/*`、`/dashboard/conversations/[id]` |
| AI业务规则 | 隐藏（V2） | `/dashboard/settings/business-rules` |

---

## 05 报价管理（核心）

**作用：** 完成销售成交。

| 页面 | 侧栏 | Console 路由 |
|------|------|--------------|
| 报价列表 | 可见 | `/dashboard/quotes` |
| 报价模板 | 可见 | `/dashboard/quotes/templates` |
| 新建报价 | 隐藏 | `/dashboard/quotes/new` |
| 报价详情 | 隐藏 | `/dashboard/quotes/[id]`、`/dashboard/quotes/detail` |
| PDF预览 | 隐藏 | `/dashboard/quotes/[id]/preview` |
| 客户报价页 | 隐藏 | `/dashboard/quotes/[id]/customer`、公开 token 路由 |

**报价状态：** 草稿、待发送、已发送、客户查看、待确认、成交、丢单、作废。

---

## 06 数据中心

**作用：** 老板分析经营。

| 页面 | 侧栏 | Console 路由 |
|------|------|--------------|
| 成交漏斗 | 可见 | `/dashboard/sales` |
| 渠道分析 | 可见 | `/dashboard/reports/channel` |
| 销售分析 | 可见 | `/dashboard/reports/follow-up` |
| 报表导出 | 可见 | `/dashboard/reports/export` |

---

## 07 系统设置

| 页面 | 侧栏 | Console 路由 |
|------|------|--------------|
| 企业资料 | 可见 | `/dashboard/team/profile` |
| 团队成员 | 可见 | `/dashboard/team` |
| 角色权限 | 可见 | `/dashboard/team/roles` |
| 操作日志 | 可见 | `/dashboard/logs` |
| 个人设置 | 可见 | `/dashboard/settings/account` |
| 邀请成员 | 隐藏 | `/dashboard/team/invite`（从团队成员页进入） |
| 套餐与账单 / 安全设置 | 隐藏（V2） | `/dashboard/team/billing`、`/dashboard/team/security` |

**V1 基础角色：** 老板、管理员、销售。

---

## 开发依据（冻结后）

本结构作为后续唯一 IA 准绳：

- UI 设计依据
- 前端路由依据
- 后端接口模块划分依据
- 数据库模块划分依据
- Cursor / Codex 开发依据

**禁止：** 新增第 8 个一级主类、重命名一级主类、把 V2 能力塞进侧栏主类。

**允许：** 在一级主类下的页面内增加字段、状态、子 Tab、接口；V2 能力保留代码但从侧栏隐藏（见 `docs/BACKLOG.md`）。

---

## 附录：Console 侧栏实现（2026-07-11）

实现文件：`apps/console/src/lib/navigation.ts`

```text
工作台
  老板首页 / 管理员首页 / 销售首页

客户机会
  快速录入 / 询盘中心 / 跟进任务

获客中心
  AI选型页 / 官网Widget / 销售链接 / 二维码管理

AI中心
  AI助手 / 知识库 / AI测试

报价管理
  报价列表 / 报价模板

数据中心
  成交漏斗 / 渠道分析 / 销售分析 / 报表导出

系统设置
  企业资料 / 团队成员 / 角色权限 / 操作日志 / 个人设置
```
