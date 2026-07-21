# Console 验收结果 2026-07-05

环境：`http://localhost:3010` · Console mode: **upstream**（`API_BASE_URL` 已配置）
验收账号：`owner@qiyun.ai` · 浏览器会话已登录

## 桌面端（C-I11-1）

### Pass

| 页面 | 说明 |
|------|------|
| `/login` | 表单、协议链接、验证码/试用入口完整；无布局崩溃 |
| `/trial` | 试用表单字段与 CTA 正常 |
| `/reset-password` | 重置密码面板可访问（HTTP 200） |
| `/dashboard` | 绿色「正式 API」Badge +「正式 API 模式」「真实数据说明」Banner；KPI、筛选、最近会话加载正常 |
| `/dashboard/reports` | Banner + footnote 正常；日期筛选加载后可用；KPI/图表/导出 CSV 可见 |
| `/dashboard/bots` | 「正式 API 模式」Banner；「+ 新建机器人」可用（upstream 非只读）；机器人列表加载 |
| `/dashboard/leads` | 「正式 API 模式」Banner；筛选/导出可用；空态文案正确 |
| `/dashboard/sites` | 「正式 API 模式」Banner；安装向导、白名单、密钥、Widget 校验面板完整 |
| `/dashboard/conversations` | 加载完成后显示「正式 API 模式」Banner；20 条会话列表；筛选可用 |
| `/dashboard/team` | 「正式 API 模式」Banner；成员列表、邀请表单正常 |
| `/dashboard/system-status` | 「正式 API 模式」Banner；6/6 依赖健康；运行模式「真实 API」 |
| `/dashboard/knowledge-bases` | 登录后 200 |
| 通知中心 | 铃铛展开面板；高意向通知列表；点击未读项后从列表移除（已读即移除） |

### 观察项（非阻塞）

| 页面 | 说明 |
|------|------|
| `/dashboard/conversations` | 首屏加载瞬间曾短暂显示「演示模式」，数据就绪后切换为「正式 API 模式」（加载竞态，不影响最终态） |
| 通知中心 | 1 条历史「已读」通知仍可见（可能为服务端已读态与前端过滤时序差异，点击新通知后移除行为正常） |
| 全局 | Next.js dev overlay 显示「1 Issue」（运行时 warning，未深入排查） |

### Fail / 阻塞

| 页面 | 问题 | 复现 | 建议修复点 |
|------|------|------|------------|
| `/register` → `/trial` | 预期行为：注册未开放，统一走申请试用 |
| `/dashboard/super-admin` | 307 重定向到 `/dashboard` | owner 账号访问超管路由 | 需 platform admin 账号或路由守卫文案（后端/鉴权，非前端文案任务） |

## 移动端（C-I11-2）

视口 390×844（CDP mobile emulation）· 已登录会话：

### Pass

| 页面 | 说明 |
|------|------|
| `/login` | 单列卡片布局，输入框与主按钮可点，无横向溢出 |
| `/trial` | 表单纵向堆叠，CTA 清晰 |
| `/dashboard` | 顶栏（汉堡/通知/工作区）正常；「正式 API 模式」「真实数据说明」Banner 可见；KPI 卡片纵向堆叠无溢出 |
| `/dashboard/bots` | 「正式 API 模式」Banner；「+ 新建机器人」可见；机器人卡片单列布局正常 |

### 待补

| 页面 | 说明 |
|------|------|
| `/dashboard/reports` 等其余子页 | 移动端 Sheet/筛选/顶栏可再补一轮（本次仅抽检 dashboard + bots） |
| 高意向通知跳转 | 桌面端点击通知后列表移除正常；跳转至会话页 + FollowUpBar 需补目视确认 |

## H-10 / C-REVIEW-03 文案收口摘要

- 共享源：`mode-copy.ts` + `data-mode-hints.ts` + `messages.ts`
- Bots preview：**只读**，移除「可创建/可编辑/写入演示数据」误导
- Dashboard/Reports：footnote 说明演示快照 vs 正式 API 策略差异
- Sites：密钥/测试消息成功提示区分 preview/upstream
- Notifications：`previewHintTitle` 由 Console 注入，packages/ui 不依赖 console i18n

## 自动化测试

- `apps/console/src/lib/console/mode-copy.test.ts` — 88 tests pass
- `apps/console` eslint ✅ · tsc ✅
- `packages/ui` tsc ✅
