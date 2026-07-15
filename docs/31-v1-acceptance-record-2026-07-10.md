# 企云图 AI V1 首轮正式验收记录

最后更新：2026-07-10
验收执行人：Codex
验收范围：V1 冻结版

关联文档：

- `docs/28-v1-acceptance-matrix.md`
- `docs/29-v1-final-page-checklist.md`
- `docs/30-v1-dispatch-templates.md`
- `TASKS.md`

---

## 一、验收目标

本记录用于沉淀 V1 首轮正式验收结果，确认系统是否已经达到以下标准：

1. 能演示
2. 能联通
3. 能形成 V1 业务闭环

本记录只覆盖 V1 范围，不包含 V2 扩展模块。

---

## 二、当前结论

当前结论：**有条件交付**（详见 `docs/33-v1-demo-acceptance-report-final.md`）

阶段判断：

- 自动化基线：`通过`（API 50/50，Console 95/95）
- Demo 脚本冒烟：`通过`（upstream 模式，2026-07-10）
- 后端收口 V1-BE-01 / V1-BE-02：`已完成`
- 前端逐页人工验收：`未完成`（V1-ACC-01）
- 最终生产发布：`待 ACC-01 签字`

首轮判断：

- V1 九大模块均已具备主体页面或主链路，不属于“从 0 到 1 未完成”状态
- 当前更接近“可演示、待收边”的阶段，而不是“不可运行”
- 阻塞最终交付的重点已收敛到少量收口项，而不是大面积缺功能

---

## 三、自动化基线结果

本轮已确认的自动化结果：

| 项目 | 结果 | 说明 |
|------|------|------|
| Console lint | PASS | 已通过 |
| Console typecheck | PASS | 已通过 |
| Console test | PASS | 95 / 95 通过 |
| API test (`app.test.ts`) | PASS | 50 / 50 通过 |
| API audit-labels test | PASS | 2 / 2 通过 |
| Demo 脚本 (`run-demo-acceptance.ps1`) | PASS | upstream 模式，2026-07-10 |
| Demo 脚本（无 `-AllowDegradedHealth`） | PASS | 2026-07-10 晚 · `/health` 全绿 |

---

## 四、V1 模块验收状态

| 模块 | 当前状态 | 说明 |
|------|------|------|
| 01 工作台 | 预通过 | 三类角色首页已落地，待逐页核对指标口径与入口可达性 |
| 02 企业与账号 | 预通过 | 登录、找回密码、多租户、成员邀请主链路已具备，待补异常流验收 |
| 03 获客入口 | PARTIAL | AI 选型页、Widget、销售链接主体已具备，编辑器与安装链路仍需收边 |
| 04 AI 能力中心 | PARTIAL | 助手配置、知识库与测试主体已具备，真实问答效果仍需继续验收 |
| 05 客户机会 | 预通过 | 询盘、线索、会话、详情主链路已具备，待业务流转走查 |
| 06 销售跟进 | 预通过 | 跟进任务与记录链路已具备，待自动规则串联验收 |
| 07 报价管理 | 预通过 | 模板 API、HTML 文档、公开报价、客户查看页已接真接口（V1-BE-01）；UI 视觉待 V1-FE-02 |
| 08 数据中心 | 预通过 | 基础报表页面已具备，待核对真实统计口径 |
| 09 系统设置 | 预通过 | 操作日志写入与可读摘要已齐（V1-BE-02）；设置 IA 待 V1-FE-03 |

---

## 五、已确认通过项

### 1. 文档级验收基线

- 已建立 V1 验收矩阵
- 已建立逐页验收清单
- 已建立固定派工模板
- 已建立当前任务看板

### 2. 前端自动化基线

- Console lint 通过
- Console typecheck 通过
- Console test 通过

### 3. 首轮结构性验收结论

- 九大 V1 一级模块均已进入可验收状态
- 工作台、企业与账号、客户机会、销售跟进、数据中心的主体结构已基本完整
- 获客入口、AI 能力中心、报价管理、系统设置仍有收边项，但已不是缺失主体功能
- 当前剩余问题主要集中在体验收边、少量链路补齐、以及真实数据口径确认

### 4. 已有外部运行证据

- System Status 已返回 PostgreSQL、Redis、Qdrant、MinIO、Embedding 可达
- 登录、验证码登录、注册、用户协议、隐私政策等公共入口问题已进入修复与复验阶段
- 知识库上传、文档处理、失败提示、错误码联调已形成明确整改方向

---

## 六、待继续核对项

以下项目建议作为下一轮逐页验收重点：

### 1. 公共入口

- 首页 `/`
- 试用申请 `/trial`
- 登录 `/login`
- 注册 `/register`
- 忘记密码 `/forgot-password`
- 重置密码 `/reset-password`

### 2. 三类角色首页

- 老板首页
- 管理员首页
- 销售首页

### 3. V1 核心业务闭环

- AI 选型页提交是否能形成询盘
- Widget 对话是否能形成线索
- 销售链接是否能进入询盘
- 询盘是否能分配和跟进
- 报价是否能创建、更新阶段并沉淀记录

### 4. AI 与知识库

- 知识库上传
- 文档处理状态
- 文档失败提示
- 知识库问答命中效果
- 引导留资话术是否符合销售场景

---

## 七、当前已知风险

| 风险项 | 当前判断 | 说明 |
|------|------|------|
| 部分页面仍存在 Preview / Mock 降级 | 有风险 | 需逐页确认是否已切正式接口 |
| 部分后端能力仍需全链路补测 | 有风险 | 尤其是上传、解析、队列、RAG、SSE |
| 报价模板 / PDF / 客户查看页 | 已收口（后端） | V1-BE-01 完成；FE 视觉见 V1-FE-02 |
| 操作日志基础验收 | 已收口（后端） | V1-BE-02 完成；逐页见 ACC-01 |

首轮阻塞项汇总（更新 2026-07-10）：

1. ~~报价模板 / PDF / 客户查看页后端~~ → **已解决（V1-BE-01）**
2. ~~操作日志写入与查询~~ → **已解决（V1-BE-02）**
3. 获客入口仍需补 AI 选型页编辑器、手机端体验、Widget 安装指引最终收边（V1-FE-01）
4. AI 能力中心仍需补“真实知识库问答效果”与“销售引导留资效果”复验（ACC-01）
5. 报价与客户查看页 UI 视觉收边（V1-FE-02）
6. 系统设置信息架构收边（V1-FE-03）

---

## 八、下一步建议

建议按以下顺序继续补全验收记录：

1. 按 `docs/29-v1-final-page-checklist.md` 逐页打勾
2. 每完成一个模块，就把结果追加到本文件
3. 对阻塞项单独记录为“未通过原因 + 责任人 + 修复状态”
4. 当 01 到 09 模块都完成后，再给出最终“可交付 / 不可交付”结论

---

## 十四、ACC-01 第二轮验收进展（2026-07-10 晚）

执行环境：`http://localhost:3000` Console · `http://localhost:3001` API · **upstream + postgres 全栈**

验收账号：

| 角色 | 邮箱 | 密码 | 说明 |
|------|------|------|------|
| 租户 Owner | `owner@qiyun.ai` | `Qiyun@2026` | 主验收账号（postgres 工作区） |
| 平台超管 | `platform@qiyun.ai` | `Qiyun@2026` | 试用审核 / 开通工作区 |

### 自动化（本轮复跑）

| 项目 | 结果 |
|------|------|
| `run-demo-acceptance.ps1`（**无** degraded） | PASS |
| API test | 189 pass / 0 fail |
| Console test | 95 pass / 0 fail |
| `run-business-flow.mjs` API 段 | 11/11 PASS |
| `run-flow-completeness.mjs` | PARTIAL（见阻塞项） |

### 浏览器抽检（Owner · upstream）

| 页面 | 结果 | 备注 |
|------|------|------|
| `/login` | PASS | 密码登录成功 |
| `/dashboard` | PASS | KPI、漏斗、快捷入口可见 |
| `/dashboard/bots` | PASS | 显示「正式 API 模式」 |
| `/dashboard/knowledge-bases` | PASS | 页面可开；文档列表需核对是否上游真数据 |
| `/dashboard/leads` | PASS | 页面可开；列表为空或加载中，待补数据走查 |
| `/dashboard/super-admin` | PASS | 平台账号试用审核页可用 |

### API 路由抽检（Owner token）

| 路由 | 结果 |
|------|------|
| `/dashboard` `/bots` `/sites` `/conversations` `/leads` `/inquiries` | 200 |
| `/quote-opportunities` `/knowledge-bases` `/notifications` | 200 |
| `/settings/business-rules` `/reports` | 200 |
| `/calendar/events` `/files` `/channels` `/selection-pages` `/sales-links` | 200 |
| `/quote-templates` | **404** |
| `/audit/logs` | **404** |

### Console BFF 抽检（登录 Cookie）

| 路由 | 结果 |
|------|------|
| `/api/dashboard` `/api/bots` `/api/sites` `/api/leads` … | 200 |
| `/api/quote-templates` | **404**（当前运行中的 Console 构建未包含该 BFF） |
| `/api/audit/logs` | **404**（应为 `/api/audit-logs`） |

### 本轮阻塞 / 待修复

1. **运行态 API 缺 V1-BE-01/02 路由**：源码与测试已通过，但当前 `3001` 进程/镜像未加载 `quote-templates`、`audit/logs` → 需 **重启 API 或重建 Docker 镜像**。
2. **Console 运行构建偏旧**：`/api/quote-templates` BFF 404 → 需 **重启 Console dev 或重建 prod 镜像**。
3. **线索 POST 500**：`run-flow-completeness` 三轮 `leads create=ERR_500`，待后端排查。
4. **E2E 默认密码**：租户 Owner 与脚本默认均为 `Qiyun@2026`（Playwright 浏览器待安装）。

### 下一步（ACC-01 续）

1. 重启本地全栈（`dev-all.ps1` 或 docker compose）使最新 API/Console 代码生效
2. 按 `docs/29-v1-final-page-checklist.md` 逐模块打勾（优先：询盘→跟进→报价闭环）
3. 安装 Playwright 后跑 `node apps/console/e2e/run-ui-flow-test.mjs`
4. 回填本文件模块级「当前判定」与签字区

---

## 十五、ACC-01 第三轮验收（2026-07-12）

执行环境：Console `http://localhost:3000` · API `http://localhost:3001` · **upstream** · health=`ok`

验收账号：`owner@qiyun.ai` / `Qiyun@2026` · workspace `ws_dev`

### 本轮前置已完成（同会话 FE 收边）

| 任务 | 结果 |
|------|------|
| V1-FE-01 选型页新建/编辑适配 | DONE |
| V1-FE-02 报价页视觉抛光 | DONE |
| V1-FE-03 + REV-01 导航 V2 收口 | DONE（侧栏对齐 `docs/36`） |

### 自动化 / 冒烟

| 项目 | 结果 | 说明 |
|------|------|------|
| `scripts/run-demo-acceptance.ps1`（无 degraded） | **PASS** | health / mode=upstream / 关键页可达 |
| `e2e/run-acc01-checklist.mjs` 页面 HTTP 烟测 | **33/33 PASS** | 公共入口 + 七大模块主路由均可登录后打开，无 5xx/应用崩溃 |
| 关键 API 烟测（Bearer） | **12/12 PASS** | health / bots / inquiries / quotes / templates / selection-pages / sales-links / sites / KB / audit-logs / follow-tasks / reports |
| `run-business-flow.mjs` API 段 | **11/11 PASS**（本轮重跑时） | 浏览器段因 Playwright Chromium 未安装中断 |
| `run-ui-flow-test.mjs` | **未跑通** | Playwright 可执行文件缺失：需 `npx playwright install` |

报告文件：`apps/console/ACC01-CHECKLIST-REPORT.json`

### 模块级更新（对照 docs/29）

| 模块 | 判定 | 证据 |
|------|------|------|
| 0 验收前检查 | PASS（Owner 账号） | health ok · upstream · Console 可开；销售/管理员多账号未本轮切换验证 |
| 1 公共入口 | PASS（页可开） | `/` `/trial` `/login` `/register` `/forgot-password` HTTP 200 |
| 2 工作台 | PASS（页可开） | boss / admin / sales-rep 均可打开 |
| 3 企业与账号 | PASS（页可开） | team / profile / roles 可开；跨租户隔离未本轮双工作区实机对打 |
| 4 获客入口 | PASS（页可开） | landing / edit / mobile / sites / links / qrcodes 可开 |
| 5 AI 能力中心 | PASS（页可开） | bots / knowledge-bases / conversations/test 可开；RAG 命中质量未本轮问答评测 |
| 6 客户机会 | PASS（页可开） | quick-entry / inquiries / tasks 可开 |
| 7 销售跟进 | PASS（页可开） | tasks 可开；自动规则串联未本轮端到端造数 |
| 8 报价管理 | PASS（页可开） | quotes / templates / new 可开；`/quote-templates` API 200 |
| 9 数据中心 | PASS（页可开） | sales / channel / follow-up / export 可开 |
| 10 系统设置 | PASS（页可开） | profile / team / roles / logs / account / system-status 可开；`/audit-logs` API 200 |
| 11 最终闭环 | **PARTIAL** | 页与 API 就绪；**访客选型→留资→询盘→跟进→报价→成交**完整一次造数仍需产品/销售手工走通或待 Playwright 恢复后重跑 |

### 本轮已知限制（非阻塞发布，但签字前需知悉）

1. 本机 Playwright Chromium 缺失，浏览器交互 E2E（UI 49 步 / BF 15 步）未能复跑。
2. 三角色切换、多租户串数据、自动跟进规则、公开选型页真实留资 → 仍建议人工点一次。
3. 知识库「真实问答命中效果」属效果验收，不在 HTTP 烟测范围。

### 结论（第三轮）

- **页面可达性 / 主 API 可达性：通过**
- **发布建议：仍维持「有条件交付」** → Staging 可用；Production 建议补：
  1. 安装 Playwright 后复跑 `run-ui-flow-test.mjs` + `run-business-flow.mjs`
  2. 产品按 docs/29 §11 手工跑通 1 条完整获客→成交闭环并签字

### 建议签字状态

| 角色 | 建议 | 说明 |
|------|------|------|
| 后端验收 | 可签「冒烟通过」 | API 12/12 + demo script PASS |
| 前端验收 | 可签「主页面可达 + FE 收边完成」 | 交互 E2E 待 Playwright |
| 产品验收 | **暂缓最终签** | 待 §11 闭环手工走通 |
| 联调验收 | 可签「upstream 联通」 | demo acceptance PASS |

### Playwright 复跑（同日稍后 · Chromium 已安装）

| 套件 | 结果 |
|------|------|
| `run-ui-flow-test.mjs` | **49/49 PASS（100%）** |
| `run-business-flow.mjs` | **API 11/11 + 浏览器 15/15 = 26/26 PASS** |
| `run-customer-journey.mjs` | **16/16 PASS** |

附注：首轮 UI 有 1 项失败（询盘「导出」在点击「新建询盘」跳转后找不到）——已修正 E2E 顺序（先验导出、再验新建入口）后复跑全绿。

前端交互 E2E 阻塞已解除；产品仍建议按 docs/29 §11 手工走通 1 条获客→成交后再做最终签字。

---

## 九、验收结论

最终发布结论：**有条件交付**

完整报告见 [`docs/33-v1-demo-acceptance-report-final.md`](./33-v1-demo-acceptance-report-final.md)

结论说明：

- **可演示**：九大模块主体齐全，Demo 脚本与自动化测试通过
- **可联通**：Console upstream + API 50 项集成测试覆盖主闭环
- **暂不建议直接 Production**：需完成 V1-ACC-01 逐页人工验收

---

## 十、模块级验收记录

### 01 工作台

当前判定：`进行中`

已确认：

- 已具备老板首页
- 已具备管理员首页
- 已具备销售首页
- 已具备角色化首页入口

待核对：

- 指标口径是否与真实业务数据一致
- 首页快捷入口是否全部可达
- 空状态和异常状态是否完整

阶段结论：`主结构已完成，待逐页验收`

### 02 企业与账号

当前判定：`进行中`

已确认：

- 登录页可用
- 验证码登录链路已补齐
- 忘记密码与重置密码链路已补齐
- 多租户工作区基础链路已存在
- 成员、邀请、基础角色链路已具备

待核对：

- 注册链路字段一致性
- 超级管理员与普通管理员边界
- 无权限工作区访问拦截

阶段结论：`主链路已完成，需补异常流验收`

### 03 获客入口

当前判定：`PARTIAL`

已确认：

- AI 选型页管理主体已具备
- Widget 管理主体已具备
- 销售链接主体已具备
- 试用申请页已存在

待核对：

- AI 选型页编辑器完整体验
- Widget 安装说明与校验链路
- 销售链接详情与二维码链路

阶段结论：`主入口已成型，剩余工作集中在编辑器、安装链路与移动端收边`

### 04 AI 能力中心

当前判定：`PARTIAL`

已确认：

- 助手配置主体已具备
- 知识库列表与上传主体已具备
- 文档状态与失败提示链路已具备

待核对：

- 知识库测试命中率
- 引导留资话术是否符合销售场景
- 真实 embedding / RAG / 检索阈值效果

阶段结论：`主能力已具备，剩余重点是知识库真实问答效果与销售话术验收`

### 05 客户机会

当前判定：`进行中`

已确认：

- 询盘中心主体已具备
- 线索列表与详情主体已具备
- 会话与 AI 摘要链路已具备

待核对：

- 状态流转是否完全符合 V1 销售链路
- 分配销售、补充资料、转报价是否顺畅
- 详情页附件与记录区块是否完整

阶段结论：`主链路已完成，待业务走查`

### 06 销售跟进

当前判定：`进行中`

已确认：

- 跟进任务主体已具备
- 跟进记录主体已具备
- 自动跟进触发基础链路已存在

待核对：

- 新询盘自动创建首次跟进
- 报价发送后的跟进任务生成
- 跟进统计口径与报表一致性

阶段结论：`可用性较高，待串联验收`

### 07 报价管理

当前判定：`PARTIAL`

已确认：

- 报价列表主体已具备
- 报价详情主体已具备
- 阶段更新链路已具备

待核对：

- 报价模板管理
- PDF 预览 / 导出
- 客户报价查看页

阶段结论：`内部链路基本可用，对外交付相关页面仍是首轮未完成项`

### 08 数据中心

当前判定：`进行中`

已确认：

- 基础报表页主体已具备
- 渠道与销售统计入口已存在

待核对：

- 成交漏斗
- 渠道分析
- 跟进分析
- 报表导出

阶段结论：`页面骨架已具备，需核对真实统计口径`

### 09 系统设置

当前判定：`PARTIAL`

已确认：

- 团队成员主体已具备
- 角色权限基础链路已具备
- 企业资料与系统状态页已存在

待核对：

- 操作日志基础页
- 企业资料保存与展示一致性
- 角色权限说明是否足够清晰

阶段结论：`基础配置已完成，操作日志与最终信息架构仍需收口`

---

## 十一、发布前签字项

以下项目全部满足后，V1 才建议进入发布验收：

- [ ] 公共入口页全部可打开且无阻断错误
- [ ] 三类角色首页全部可正常进入
- [ ] AI 选型 / Widget / 销售链接至少各完成一条可验证获客链路
- [ ] 知识库上传、处理、测试问答可闭环
- [ ] 询盘到跟进到报价至少跑通一条完整链路
- [ ] 数据中心关键指标可展示
- [ ] 系统设置基础配置可保存
- [ ] 自动化测试结果已沉淀到本记录
- [ ] 阻断问题已清零或明确降级策略

---

## 十二、签字区

产品验收：`待填写`

前端验收：`待填写`

后端验收：`待填写`

联调验收：`待填写`

最终发布时间：`待填写`

---

## 十三、首轮正式验收结论

首轮结论：**有条件交付**（2026-07-10 更新）

说明：

1. V1 九大模块均已具备主体形态，Demo 脚本与自动化基线通过。
2. V1-BE-01（报价模板/文档）与 V1-BE-02（操作日志）后端收口已完成。
3. 剩余阻塞收敛为：**人工逐页验收（ACC-01）** + **3 项 FE 视觉收边**。
4. 建议：**Staging 有条件交付 → ACC-01 通过后 Production**。

详细阻塞项与上线建议见 `docs/33-v1-demo-acceptance-report-final.md`。
