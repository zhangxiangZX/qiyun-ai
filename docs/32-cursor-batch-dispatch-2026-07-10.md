# Cursor 批量派工单

日期：2026-07-10
负责人：Cursor
验收基线：

- `E:/qiyun-ai/docs/28-v1-acceptance-matrix.md`
- `E:/qiyun-ai/docs/29-v1-final-page-checklist.md`
- `E:/qiyun-ai/docs/31-v1-acceptance-record-2026-07-10.md`
- `E:/qiyun-ai/TASKS.md`

统一规则：

1. 你是本项目的前端 / UI 负责人。
2. 只允许修改 `apps/console` 和 `packages/ui`。
3. 不修改后端 API、数据库、鉴权、Docker、队列、Worker。
4. 所有页面必须补齐 `loading / empty / error / success` 状态。
5. 不允许保留 `#` 假链接、无反馈按钮、乱码文案、纯演示占位文案。
6. 必须适配桌面端和移动端。
7. 完成每个任务后列出修改文件，并运行 `lint` 和 `typecheck`。

---

## 任务 1：公共入口页最终收边

阅读后开始：

- `E:/qiyun-ai/docs/29-v1-final-page-checklist.md`

当前任务：`V1-PUBLIC-FINAL`

目标页面：

- `/`
- `/trial`
- `/login`
- `/register`
- `/forgot-password`
- `/reset-password`
- `/legal/user-agreement`
- `/legal/privacy-policy`

要求：

1. 检查所有按钮、链接、表单提交流程是否都可点击。
2. 统一错误提示语，避免冲突文案。
3. 注册页中邮箱、手机号、验证码等字段逻辑要一致，不允许“界面能填、提交又报缺字段”。
4. 用户协议和隐私政策入口必须完整可达。
5. 页面文案要正式、自然、面向企业客户。

交付输出：

- 修改文件列表
- 页面级问题修复说明
- `lint` / `typecheck` 结果

---

## 任务 2：工作台与角色首页最终收边

当前任务：`V1-DASHBOARD-FINAL`

目标页面：

- `/dashboard`
- `/dashboard/boss`
- `/dashboard/admin`
- `/dashboard/sales-rep`

要求：

1. 逐页检查老板、管理员、销售三个首页的信息结构是否符合 V1 定位。
2. 清理不必要的预览态、空壳卡片和无效跳转。
3. 补齐空状态、无数据状态、异常状态。
4. 所有快捷入口必须可达真实页面，不能跳到不存在路由。
5. 卡片文案统一为正式中文，去掉实验性措辞。

交付输出：

- 修改文件列表
- 首页收边说明
- `lint` / `typecheck` 结果

---

## 任务 3：获客入口页收边

当前任务：`V1-ACQUISITION-FINAL`

目标页面：

- `/dashboard/bots`
- `/dashboard/bots/config`
- `/dashboard/bots/landing`
- `/dashboard/sites`
- `/dashboard/sites/new`
- `/dashboard/sites/install`
- `/dashboard/channels`
- `/dashboard/sales`

要求：

1. AI 选型页管理、Widget 管理、销售链接管理三条线都要具备可演示的管理视图。
2. 安装说明、复制代码、域名白名单、站点密钥展示要完整清晰。
3. 所有“创建”“编辑”“查看详情”按钮必须有结果页面或明确反馈。
4. 如果某功能受后端能力限制，必须做清楚的前端降级提示，不能假装成功。
5. 保持 V1 边界，不扩展 V2 模块。

交付输出：

- 修改文件列表
- 三条获客入口的收边说明
- `lint` / `typecheck` 结果

---

## 任务 4：AI 能力中心与知识库体验收边

当前任务：`V1-AI-KB-FINAL`

目标页面：

- `/dashboard/knowledge-bases`
- `/dashboard/knowledge-bases/upload`
- `/dashboard/conversations/test`
- `/dashboard/bots/config`

要求：

1. 知识库列表、上传、处理状态、失败状态、删除动作都要体验完整。
2. 失败状态必须按 `errorCode` 做前端提示映射，不再依赖纯文本猜测。
3. 测试问答页要清楚区分“命中知识库”“未命中资料”“建议留资”三类结果。
4. 预览模式和正式模式的提示语要清晰区分。
5. 所有处理中的提示都要像企业后台，而不是开发调试页。

交付输出：

- 修改文件列表
- `errorCode` 联调说明
- `lint` / `typecheck` 结果

---

## 任务 5：客户机会、跟进、报价链路收边

当前任务：`V1-SALES-FLOW-FINAL`

目标页面：

- `/dashboard/leads`
- `/dashboard/leads/[id]`
- `/dashboard/conversations`
- `/dashboard/conversations/[id]`
- `/dashboard/quotes`
- `/dashboard/inquiries`
- `/dashboard/tasks`

要求：

1. 用 V1 销售链路视角检查页面，不要只看组件是否能渲染。
2. 线索状态、跟进动作、报价阶段要统一，不允许同一业务对象出现多套中文名称。
3. 详情页必须可理解，信息分区要清晰。
4. 补齐无跟进记录、无附件、无报价、无会话等空态。
5. 如果某个写操作仍是只读或预览态，必须明确标识。

交付输出：

- 修改文件列表
- 销售链路页面统一说明
- `lint` / `typecheck` 结果

---

## 任务 6：数据中心与系统设置最终收边

当前任务：`V1-OPS-FINAL`

目标页面：

- `/dashboard/reports`
- `/dashboard/reports/channel`
- `/dashboard/reports/follow-up`
- `/dashboard/reports/export`
- `/dashboard/settings`
- `/dashboard/team`
- `/dashboard/logs`
- `/dashboard/system-status`
- `/dashboard/super-admin`

要求：

1. 报表页要统一口径与中文命名，去掉演示型噪音卡片。
2. 系统设置页要保证信息结构清楚，适合管理员日常使用。
3. 超级管理员页只保留 V1 实际需要内容，审核页并入超级管理员区，不单独做公共入口。
4. 系统状态页文案要面向运营人员，而不是仅面向开发者。
5. 所有表格、筛选、分页、空态样式统一。

交付输出：

- 修改文件列表
- 运维与系统页收边说明
- `lint` / `typecheck` 结果

---

## 回传格式

完成后按下面格式回复：

```md
任务：V1-XXXX

修改文件：
- ...

完成内容：
1. ...
2. ...

验证结果：
- lint: pass / fail
- typecheck: pass / fail

已知限制：
- ...
```
